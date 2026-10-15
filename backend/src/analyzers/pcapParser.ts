import fs from 'fs';
import { safeExec } from '../utils/exec.js';
import { detectTshark } from './tsharkDetector.js';
import { Logger } from '../utils/logger.js';

export interface ParsedPacket {
  frameNumber: number;
  timestamp: number;
  timestampIso: string;
  length: number;
  protocol: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort?: number;
  destinationPort?: number;
  tcpFlags?: {
    syn: boolean;
    ack: boolean;
    rst: boolean;
    fin: boolean;
    psh: boolean;
    raw: string;
  };
  icmpDetails?: {
    type: number;
    code: number;
    typeName: string;
  };
  dnsDetails?: {
    queryName?: string;
    isResponse: boolean;
    rcode?: number;
    rcodeName?: string;
    answersCount?: number;
  };
  summary: string;
  layerDetails?: Record<string, any>;
}

export interface CaptureAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  parserUsed: 'TSHARK' | 'NATIVE_PCAP_PARSER';
  tsharkVersion?: string;
  totalPackets: number;
  durationSeconds: number;
  protocolBreakdown: Record<string, number>;
  packets: ParsedPacket[];
  dnsSummary: {
    queriesCount: number;
    responsesCount: number;
    unansweredQueries: string[];
    errorResponses: Array<{ query: string; rcode: number; rcodeName: string }>;
  };
  tcpSummary: {
    synSent: number;
    synAckReceived: number;
    resets: number;
    unacknowledgedSyns: number;
  };
  icmpSummary: {
    echoRequests: number;
    echoReplies: number;
    unreachableCount: number;
    messages: Array<{ type: number; code: number; meaning: string; src: string; dst: string }>;
  };
  keyFindings: string[];
  limitations: string;
}

export async function parseCaptureFile(filePath: string): Promise<CaptureAnalysisResult> {
  const stats = await fs.promises.stat(filePath);
  const tshark = await detectTshark();

  if (tshark.isAvailable && tshark.executablePath) {
    try {
      return await parseWithTshark(filePath, stats.size, tshark.executablePath, tshark.version);
    } catch (err: any) {
      Logger.warn(`TShark execution failed on ${filePath}, falling back to native parser: ${err.message}`);
    }
  }

  // Fallback to Native pure-TS PCAP/PCAPNG parser
  const buffer = await fs.promises.readFile(filePath);
  return parseWithNativeParser(buffer, filePath, stats.size);
}

/**
 * TShark-based parser
 */
async function parseWithTshark(
  filePath: string,
  fileSize: number,
  tsharkBin: string,
  tsharkVersion?: string
): Promise<CaptureAnalysisResult> {
  const fields = [
    '-e', 'frame.number',
    '-e', 'frame.time_epoch',
    '-e', 'frame.len',
    '-e', 'ip.src',
    '-e', 'ip.dst',
    '-e', 'ipv6.src',
    '-e', 'ipv6.dst',
    '-e', '_ws.col.Protocol',
    '-e', 'tcp.srcport',
    '-e', 'tcp.dstport',
    '-e', 'tcp.flags',
    '-e', 'tcp.flags.syn',
    '-e', 'tcp.flags.ack',
    '-e', 'tcp.flags.reset',
    '-e', 'udp.srcport',
    '-e', 'udp.dstport',
    '-e', 'icmp.type',
    '-e', 'icmp.code',
    '-e', 'dns.qry.name',
    '-e', 'dns.flags.response',
    '-e', 'dns.flags.rcode',
  ];

  const args = ['-r', filePath, '-T', 'fields', ...fields, '-E', 'separator=\t', '-E', 'header=y'];
  const execRes = await safeExec(tsharkBin, args, 12000);

  if (execRes.exitCode !== 0 && !execRes.stdout) {
    throw new Error(`TShark failed: ${execRes.stderr}`);
  }

  const lines = execRes.stdout.trim().split('\n');
  if (lines.length <= 1) {
    // Empty capture
    return buildEmptyAnalysisResult(filePath, fileSize, 'TSHARK', tsharkVersion);
  }

  const header = lines[0].split('\t').map((h) => h.trim());
  const packets: ParsedPacket[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;

    const row: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = cols[c]?.trim() || '';
    }

    const frameNum = parseInt(row['frame.number'] || String(i), 10);
    const epoch = parseFloat(row['frame.time_epoch'] || '0');
    const length = parseInt(row['frame.len'] || '0', 10);
    const proto = row['_ws.col.Protocol'] || 'Unknown';
    const src = row['ip.src'] || row['ipv6.src'] || 'Unknown';
    const dst = row['ip.dst'] || row['ipv6.dst'] || 'Unknown';

    const srcPort = row['tcp.srcport'] || row['udp.srcport'] ? parseInt(row['tcp.srcport'] || row['udp.srcport'], 10) : undefined;
    const dstPort = row['tcp.dstport'] || row['udp.dstport'] ? parseInt(row['tcp.dstport'] || row['udp.dstport'], 10) : undefined;

    let tcpFlags: ParsedPacket['tcpFlags'];
    if (row['tcp.flags']) {
      tcpFlags = {
        syn: row['tcp.flags.syn'] === '1',
        ack: row['tcp.flags.ack'] === '1',
        rst: row['tcp.flags.reset'] === '1',
        fin: false,
        psh: false,
        raw: row['tcp.flags'],
      };
    }

    let icmpDetails: ParsedPacket['icmpDetails'];
    if (row['icmp.type']) {
      const typeNum = parseInt(row['icmp.type'], 10);
      const codeNum = parseInt(row['icmp.code'] || '0', 10);
      icmpDetails = {
        type: typeNum,
        code: codeNum,
        typeName: getIcmpTypeName(typeNum, codeNum),
      };
    }

    let dnsDetails: ParsedPacket['dnsDetails'];
    if (row['dns.qry.name'] || row['dns.flags.response']) {
      const isResp = row['dns.flags.response'] === '1';
      const rcode = row['dns.flags.rcode'] ? parseInt(row['dns.flags.rcode'], 10) : undefined;
      dnsDetails = {
        queryName: row['dns.qry.name'] || undefined,
        isResponse: isResp,
        rcode,
        rcodeName: rcode !== undefined ? getDnsRcodeName(rcode) : undefined,
      };
    }

    const summary = generatePacketSummary(proto, src, dst, srcPort, dstPort, tcpFlags, icmpDetails, dnsDetails);

    packets.push({
      frameNumber: frameNum,
      timestamp: epoch,
      timestampIso: epoch > 0 ? new Date(epoch * 1000).toISOString() : new Date().toISOString(),
      length,
      protocol: proto,
      sourceIp: src,
      destinationIp: dst,
      sourcePort: srcPort,
      destinationPort: dstPort,
      tcpFlags,
      icmpDetails,
      dnsDetails,
      summary,
    });
  }

  return aggregateCaptureFindings(filePath, fileSize, 'TSHARK', packets, tsharkVersion);
}

/**
 * Native Pure-TypeScript PCAP / PCAPNG Parser
 */
export function parseWithNativeParser(
  buffer: Buffer,
  filePath: string,
  fileSize: number
): CaptureAnalysisResult {
  if (buffer.length < 24) {
    throw new Error('Capture file is too small to be a valid PCAP or PCAPNG file (less than 24 bytes).');
  }

  const magic = buffer.readUInt32BE(0);

  // Check PCAPNG Section Header Block: 0x0A0D0D0A
  if (magic === 0x0a0d0d0a) {
    return parseNativePcapng(buffer, filePath, fileSize);
  }

  // Check Classic PCAP magic numbers:
  // 0xa1b2c3d4 (microsecond, big-endian)
  // 0xd4c3b2a1 (microsecond, little-endian)
  // 0xa1b23c4d (nanosecond, big-endian)
  // 0x4d3cb2a1 (nanosecond, little-endian)
  const isPcap =
    magic === 0xa1b2c3d4 ||
    magic === 0xd4c3b2a1 ||
    magic === 0xa1b23c4d ||
    magic === 0x4d3cb2a1;

  if (!isPcap) {
    throw new Error(
      `Unsupported capture format. Magic header 0x${magic.toString(16)} does not match standard PCAP (0xa1b2c3d4) or PCAPNG (0x0a0d0d0a).`
    );
  }

  const isLittleEndian = magic === 0xd4c3b2a1 || magic === 0x4d3cb2a1;
  const isNano = magic === 0xa1b23c4d || magic === 0x4d3cb2a1;

  // Global header is 24 bytes
  let offset = 24;
  let frameNumber = 1;
  const packets: ParsedPacket[] = [];

  while (offset + 16 <= buffer.length) {
    const tsSec = isLittleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    const tsSub = isLittleEndian ? buffer.readUInt32LE(offset + 4) : buffer.readUInt32BE(offset + 4);
    const inclLen = isLittleEndian ? buffer.readUInt32LE(offset + 8) : buffer.readUInt32BE(offset + 8);
    const origLen = isLittleEndian ? buffer.readUInt32LE(offset + 12) : buffer.readUInt32BE(offset + 12);
    offset += 16;

    if (offset + inclLen > buffer.length) {
      break; // Incomplete packet truncated at end
    }

    const packetData = buffer.subarray(offset, offset + inclLen);
    offset += inclLen;

    const epochSec = tsSec + (isNano ? tsSub / 1e9 : tsSub / 1e6);
    const parsed = decodeEthernetPacket(packetData, frameNumber++, epochSec, origLen || inclLen);
    if (parsed) {
      packets.push(parsed);
    }
  }

  return aggregateCaptureFindings(filePath, fileSize, 'NATIVE_PCAP_PARSER', packets);
}

/**
 * Native PCAPNG Parser
 */
function parseNativePcapng(
  buffer: Buffer,
  filePath: string,
  fileSize: number
): CaptureAnalysisResult {
  let offset = 0;
  let frameNumber = 1;
  const packets: ParsedPacket[] = [];

  while (offset + 8 <= buffer.length) {
    const blockType = buffer.readUInt32LE(offset);
    const blockTotalLength = buffer.readUInt32LE(offset + 4);

    if (blockTotalLength < 12 || offset + blockTotalLength > buffer.length) {
      break;
    }

    // Enhanced Packet Block: Type 0x00000006
    if (blockType === 0x00000006) {
      const tsHigh = buffer.readUInt32LE(offset + 12);
      const tsLow = buffer.readUInt32LE(offset + 16);
      const capturedLen = buffer.readUInt32LE(offset + 20);
      const originalLen = buffer.readUInt32LE(offset + 24);

      const timestampEpoch = ((tsHigh * 4294967296) + tsLow) / 1000000;
      const packetData = buffer.subarray(offset + 28, offset + 28 + capturedLen);

      const parsed = decodeEthernetPacket(
        packetData,
        frameNumber++,
        timestampEpoch > 0 ? timestampEpoch : Date.now() / 1000,
        originalLen || capturedLen
      );
      if (parsed) {
        packets.push(parsed);
      }
    }

    offset += blockTotalLength;
  }

  return aggregateCaptureFindings(filePath, fileSize, 'NATIVE_PCAP_PARSER', packets);
}

/**
 * Decode Link-layer Ethernet -> IPv4/IPv6 -> TCP/UDP/ICMP/DNS
 */
export function decodeEthernetPacket(
  buf: Buffer,
  frameNumber: number,
  epochSec: number,
  wireLength: number
): ParsedPacket | null {
  if (buf.length < 14) return null;

  const etherType = buf.readUInt16BE(12);
  let ipOffset = 14;

  let protocol = 'Ethernet';
  let srcIp = 'Unknown';
  let dstIp = 'Unknown';
  let srcPort: number | undefined;
  let dstPort: number | undefined;
  let tcpFlags: ParsedPacket['tcpFlags'];
  let icmpDetails: ParsedPacket['icmpDetails'];
  let dnsDetails: ParsedPacket['dnsDetails'];

  if (etherType === 0x0806) {
    protocol = 'ARP';
    if (buf.length >= 28) {
      const senderIp = `${buf[28]}.${buf[29]}.${buf[30]}.${buf[31]}`;
      const targetIp = `${buf[38]}.${buf[39]}.${buf[40]}.${buf[41]}`;
      srcIp = senderIp;
      dstIp = targetIp;
    }
  } else if (etherType === 0x0800) {
    // IPv4
    if (buf.length < ipOffset + 20) return null;
    const ihl = (buf[ipOffset] & 0x0f) * 4;
    const protoNum = buf[ipOffset + 9];
    srcIp = `${buf[ipOffset + 12]}.${buf[ipOffset + 13]}.${buf[ipOffset + 14]}.${buf[ipOffset + 15]}`;
    dstIp = `${buf[ipOffset + 16]}.${buf[ipOffset + 17]}.${buf[ipOffset + 18]}.${buf[ipOffset + 19]}`;
    const l4Offset = ipOffset + ihl;

    if (protoNum === 1) {
      // ICMP
      protocol = 'ICMP';
      if (buf.length >= l4Offset + 4) {
        const typeNum = buf[l4Offset];
        const codeNum = buf[l4Offset + 1];
        icmpDetails = {
          type: typeNum,
          code: codeNum,
          typeName: getIcmpTypeName(typeNum, codeNum),
        };
      }
    } else if (protoNum === 6) {
      // TCP
      protocol = 'TCP';
      if (buf.length >= l4Offset + 20) {
        srcPort = buf.readUInt16BE(l4Offset);
        dstPort = buf.readUInt16BE(l4Offset + 2);
        const flagsByte = buf[l4Offset + 13];
        const syn = (flagsByte & 0x02) !== 0;
        const ack = (flagsByte & 0x10) !== 0;
        const rst = (flagsByte & 0x04) !== 0;
        const fin = (flagsByte & 0x01) !== 0;
        const psh = (flagsByte & 0x08) !== 0;

        tcpFlags = {
          syn,
          ack,
          rst,
          fin,
          psh,
          raw: `0x${flagsByte.toString(16).padStart(2, '0')}`,
        };

        if (srcPort === 443 || dstPort === 443) protocol = 'TLS';
        else if (srcPort === 80 || dstPort === 80) protocol = 'HTTP';
      }
    } else if (protoNum === 17) {
      // UDP
      protocol = 'UDP';
      if (buf.length >= l4Offset + 8) {
        srcPort = buf.readUInt16BE(l4Offset);
        dstPort = buf.readUInt16BE(l4Offset + 2);

        if (srcPort === 53 || dstPort === 53) {
          protocol = 'DNS';
          const dnsPayload = buf.subarray(l4Offset + 8);
          dnsDetails = decodeDnsPayload(dnsPayload);
        }
      }
    }
  } else if (etherType === 0x86dd) {
    // IPv6
    protocol = 'IPv6';
    srcIp = 'IPv6-Host';
    dstIp = 'IPv6-Dest';
  }

  const summary = generatePacketSummary(protocol, srcIp, dstIp, srcPort, dstPort, tcpFlags, icmpDetails, dnsDetails);

  return {
    frameNumber,
    timestamp: epochSec,
    timestampIso: epochSec > 0 ? new Date(epochSec * 1000).toISOString() : new Date().toISOString(),
    length: wireLength,
    protocol,
    sourceIp: srcIp,
    destinationIp: dstIp,
    sourcePort: srcPort,
    destinationPort: dstPort,
    tcpFlags,
    icmpDetails,
    dnsDetails,
    summary,
  };
}

/**
 * Decode DNS payload
 */
function decodeDnsPayload(payload: Buffer): ParsedPacket['dnsDetails'] {
  if (payload.length < 12) return undefined;

  const flags = payload.readUInt16BE(2);
  const isResponse = (flags & 0x8000) !== 0;
  const rcode = flags & 0x000f;
  const qdCount = payload.readUInt16BE(4);
  const anCount = payload.readUInt16BE(6);

  let queryName: string | undefined;
  if (qdCount > 0 && payload.length > 12) {
    let pos = 12;
    const parts: string[] = [];
    while (pos < payload.length) {
      const len = payload[pos];
      if (len === 0) break;
      if (len > 63 || pos + 1 + len > payload.length) break;
      parts.push(payload.subarray(pos + 1, pos + 1 + len).toString('ascii'));
      pos += 1 + len;
    }
    if (parts.length > 0) queryName = parts.join('.');
  }

  return {
    queryName,
    isResponse,
    rcode,
    rcodeName: getDnsRcodeName(rcode),
    answersCount: anCount,
  };
}

function getDnsRcodeName(rcode: number): string {
  switch (rcode) {
    case 0: return 'NOERROR';
    case 1: return 'FORMERR';
    case 2: return 'SERVFAIL';
    case 3: return 'NXDOMAIN';
    case 4: return 'NOTIMP';
    case 5: return 'REFUSED';
    default: return `RCODE_${rcode}`;
  }
}

function getIcmpTypeName(type: number, code: number): string {
  if (type === 0) return 'Echo Reply';
  if (type === 8) return 'Echo Request';
  if (type === 11) return 'Time Exceeded (TTL Expired)';
  if (type === 3) {
    switch (code) {
      case 0: return 'Dest Net Unreachable';
      case 1: return 'Dest Host Unreachable';
      case 2: return 'Dest Protocol Unreachable';
      case 3: return 'Dest Port Unreachable';
      case 4: return 'Fragmentation Needed and DF set';
      case 13: return 'Communication Administratively Filtered';
      default: return `Dest Unreachable (code ${code})`;
    }
  }
  return `ICMP Type ${type} (code ${code})`;
}

function generatePacketSummary(
  proto: string,
  src: string,
  dst: string,
  srcPort?: number,
  dstPort?: number,
  tcpFlags?: ParsedPacket['tcpFlags'],
  icmp?: ParsedPacket['icmpDetails'],
  dns?: ParsedPacket['dnsDetails']
): string {
  if (proto === 'DNS' && dns) {
    if (dns.isResponse) {
      return `DNS Response: ${dns.queryName || 'query'} -> ${dns.rcodeName} (${dns.answersCount ?? 0} answers)`;
    }
    return `DNS Standard Query: ${dns.queryName || 'unknown'}`;
  }

  if (proto === 'ICMP' && icmp) {
    return `ICMP ${icmp.typeName} [${src} -> ${dst}]`;
  }

  if (tcpFlags) {
    const flagNames: string[] = [];
    if (tcpFlags.syn && !tcpFlags.ack) flagNames.push('SYN');
    if (tcpFlags.syn && tcpFlags.ack) flagNames.push('SYN-ACK');
    if (!tcpFlags.syn && tcpFlags.ack) flagNames.push('ACK');
    if (tcpFlags.rst) flagNames.push('RST');
    if (tcpFlags.fin) flagNames.push('FIN');
    return `${proto} ${srcPort} -> ${dstPort} [${flagNames.join(', ') || 'DATA'}]`;
  }

  if (srcPort && dstPort) {
    return `${proto} ${srcPort} -> ${dstPort}`;
  }

  return `${proto} frame (${src} -> ${dst})`;
}

function aggregateCaptureFindings(
  filePath: string,
  fileSize: number,
  parserUsed: 'TSHARK' | 'NATIVE_PCAP_PARSER',
  packets: ParsedPacket[],
  tsharkVersion?: string
): CaptureAnalysisResult {
  const protocolBreakdown: Record<string, number> = {};
  let duration = 0;

  if (packets.length > 1) {
    const firstTs = packets[0].timestamp;
    const lastTs = packets[packets.length - 1].timestamp;
    if (lastTs >= firstTs) {
      duration = Math.round((lastTs - firstTs) * 100) / 100;
    }
  }

  const dnsSummary = {
    queriesCount: 0,
    responsesCount: 0,
    unansweredQueries: [] as string[],
    errorResponses: [] as Array<{ query: string; rcode: number; rcodeName: string }>,
  };

  const queriesSeen = new Map<string, boolean>();

  const tcpSummary = {
    synSent: 0,
    synAckReceived: 0,
    resets: 0,
    unacknowledgedSyns: 0,
  };

  const icmpSummary = {
    echoRequests: 0,
    echoReplies: 0,
    unreachableCount: 0,
    messages: [] as Array<{ type: number; code: number; meaning: string; src: string; dst: string }>,
  };

  const keyFindings: string[] = [];

  for (const pkt of packets) {
    protocolBreakdown[pkt.protocol] = (protocolBreakdown[pkt.protocol] || 0) + 1;

    // DNS Analysis
    if (pkt.dnsDetails) {
      if (pkt.dnsDetails.isResponse) {
        dnsSummary.responsesCount++;
        if (pkt.dnsDetails.queryName) {
          queriesSeen.set(pkt.dnsDetails.queryName.toLowerCase(), true);
        }
        if (pkt.dnsDetails.rcode && pkt.dnsDetails.rcode !== 0) {
          dnsSummary.errorResponses.push({
            query: pkt.dnsDetails.queryName || 'unknown',
            rcode: pkt.dnsDetails.rcode,
            rcodeName: pkt.dnsDetails.rcodeName || `RCODE_${pkt.dnsDetails.rcode}`,
          });
        }
      } else {
        dnsSummary.queriesCount++;
        if (pkt.dnsDetails.queryName) {
          if (!queriesSeen.has(pkt.dnsDetails.queryName.toLowerCase())) {
            queriesSeen.set(pkt.dnsDetails.queryName.toLowerCase(), false);
          }
        }
      }
    }

    // TCP Analysis
    if (pkt.tcpFlags) {
      if (pkt.tcpFlags.syn && !pkt.tcpFlags.ack) {
        tcpSummary.synSent++;
      }
      if (pkt.tcpFlags.syn && pkt.tcpFlags.ack) {
        tcpSummary.synAckReceived++;
      }
      if (pkt.tcpFlags.rst) {
        tcpSummary.resets++;
      }
    }

    // ICMP Analysis
    if (pkt.icmpDetails) {
      if (pkt.icmpDetails.type === 8) icmpSummary.echoRequests++;
      else if (pkt.icmpDetails.type === 0) icmpSummary.echoReplies++;
      else if (pkt.icmpDetails.type === 3) {
        icmpSummary.unreachableCount++;
        icmpSummary.messages.push({
          type: pkt.icmpDetails.type,
          code: pkt.icmpDetails.code,
          meaning: pkt.icmpDetails.typeName,
          src: pkt.sourceIp,
          dst: pkt.destinationIp,
        });
      }
    }
  }

  // Identify unanswered DNS queries
  for (const [query, answered] of queriesSeen.entries()) {
    if (!answered) {
      dnsSummary.unansweredQueries.push(query);
    }
  }

  tcpSummary.unacknowledgedSyns = Math.max(0, tcpSummary.synSent - tcpSummary.synAckReceived);

  // Formulate key evidence findings
  if (dnsSummary.errorResponses.length > 0) {
    const err = dnsSummary.errorResponses[0];
    keyFindings.push(`DNS Error detected: Query for "${err.query}" received ${err.rcodeName} (code ${err.rcode}). Hostname resolution failure confirmed in packet trace.`);
  }

  if (dnsSummary.unansweredQueries.length > 0 && dnsSummary.responsesCount === 0 && dnsSummary.queriesCount > 0) {
    keyFindings.push(`DNS Query observed without corresponding response (${dnsSummary.unansweredQueries[0]}). The configured DNS server did not reply during the capture duration.`);
  }

  if (tcpSummary.synSent > 0 && tcpSummary.synAckReceived === 0) {
    keyFindings.push(`TCP SYN retransmissions observed (${tcpSummary.synSent} sent) without any SYN-ACK received. Destination host or firewall is dropping transport handshakes.`);
  }

  if (tcpSummary.resets > 0) {
    keyFindings.push(`TCP RST packet(s) detected (${tcpSummary.resets} reset frames). Connection actively rejected by target host or firewall.`);
  }

  if (icmpSummary.unreachableCount > 0) {
    const unreach = icmpSummary.messages[0];
    keyFindings.push(`ICMP Destination Unreachable observed from router ${unreach.src}: "${unreach.meaning}". Confirms routing or ARP resolution failure at hop ${unreach.src}.`);
  }

  if (keyFindings.length === 0 && packets.length > 0) {
    keyFindings.push(`Normal bidirectional packet traffic observed across ${packets.length} frames.`);
  }

  return {
    fileName: filePath.split(/[/\\]/).pop() || 'capture.pcap',
    fileSizeBytes: fileSize,
    parserUsed,
    tsharkVersion,
    totalPackets: packets.length,
    durationSeconds: duration,
    protocolBreakdown,
    packets,
    dnsSummary,
    tcpSummary,
    icmpSummary,
    keyFindings,
    limitations:
      'The absence of a packet in a capture only proves it was not observed on this capture interface. Furthermore, TLS/HTTPS payloads are cryptographically encrypted by design.',
  };
}

function buildEmptyAnalysisResult(
  filePath: string,
  fileSize: number,
  parserUsed: 'TSHARK' | 'NATIVE_PCAP_PARSER',
  tsharkVersion?: string
): CaptureAnalysisResult {
  return {
    fileName: filePath.split(/[/\\]/).pop() || 'empty.pcap',
    fileSizeBytes: fileSize,
    parserUsed,
    tsharkVersion,
    totalPackets: 0,
    durationSeconds: 0,
    protocolBreakdown: {},
    packets: [],
    dnsSummary: { queriesCount: 0, responsesCount: 0, unansweredQueries: [], errorResponses: [] },
    tcpSummary: { synSent: 0, synAckReceived: 0, resets: 0, unacknowledgedSyns: 0 },
    icmpSummary: { echoRequests: 0, echoReplies: 0, unreachableCount: 0, messages: [] },
    keyFindings: ['Capture file contains zero packets.'],
    limitations: 'Empty capture file provides no packet evidence.',
  };
}
