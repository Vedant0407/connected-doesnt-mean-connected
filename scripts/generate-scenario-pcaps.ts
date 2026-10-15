import fs from 'fs';
import path from 'path';

/**
 * Binary PCAP Generator Helper
 * Constructs standard libpcap binary files (Global Header + Packet Headers + Link-layer frames)
 */
class PcapBuilder {
  private packets: Buffer[] = [];

  constructor() {}

  public addPacket(packetData: Buffer, epochSec: number, epochMicro: number = 0): void {
    const header = Buffer.alloc(16);
    // ts_sec (32 bits, big-endian)
    header.writeUInt32BE(Math.floor(epochSec), 0);
    // ts_usec (32 bits, big-endian)
    header.writeUInt32BE(epochMicro, 4);
    // incl_len (32 bits, big-endian)
    header.writeUInt32BE(packetData.length, 8);
    // orig_len (32 bits, big-endian)
    header.writeUInt32BE(packetData.length, 12);

    this.packets.push(Buffer.concat([header, packetData]));
  }

  public toBuffer(): Buffer {
    // Standard Global PCAP Header: 24 bytes
    const globalHeader = Buffer.alloc(24);
    globalHeader.writeUInt32BE(0xa1b2c3d4, 0); // Magic number (Big-endian)
    globalHeader.writeUInt16BE(2, 4);          // Major version 2
    globalHeader.writeUInt16BE(4, 6);          // Minor version 4
    globalHeader.writeInt32BE(0, 8);           // Timezone offset (GMT = 0)
    globalHeader.writeUInt32BE(0, 12);         // Timestamp accuracy sigfigs
    globalHeader.writeUInt32BE(65535, 16);     // Snaplen (max packet capture length)
    globalHeader.writeUInt32BE(1, 20);         // Link-layer header type (1 = Ethernet DLT_EN10MB)

    return Buffer.concat([globalHeader, ...this.packets]);
  }
}

// Packet Crafting Helpers
function macToBuffer(mac: string): Buffer {
  return Buffer.from(mac.split(':').map((b) => parseInt(b, 16)));
}

function ipToBuffer(ip: string): Buffer {
  return Buffer.from(ip.split('.').map((b) => parseInt(b, 10)));
}

function createEthernetFrame(dstMac: string, srcMac: string, etherType: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(14);
  macToBuffer(dstMac).copy(header, 0);
  macToBuffer(srcMac).copy(header, 6);
  header.writeUInt16BE(etherType, 12);
  return Buffer.concat([header, payload]);
}

function createIpv4Packet(srcIp: string, dstIp: string, protocol: number, payload: Buffer, ttl: number = 64): Buffer {
  const totalLength = 20 + payload.length;
  const header = Buffer.alloc(20);
  header[0] = 0x45; // Version 4, IHL 5 (20 bytes)
  header[1] = 0x00; // DSCP / ECN
  header.writeUInt16BE(totalLength, 2);
  header.writeUInt16BE(Math.floor(Math.random() * 65535), 4); // ID
  header.writeUInt16BE(0x4000, 6); // Flags: Don't Fragment
  header[8] = ttl;
  header[9] = protocol;
  header.writeUInt16BE(0, 10); // Checksum (0 for simplicity)
  ipToBuffer(srcIp).copy(header, 12);
  ipToBuffer(dstIp).copy(header, 16);
  return Buffer.concat([header, payload]);
}

function createUdpPacket(srcPort: number, dstPort: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt16BE(srcPort, 0);
  header.writeUInt16BE(dstPort, 2);
  header.writeUInt16BE(8 + payload.length, 4);
  header.writeUInt16BE(0, 6); // Checksum
  return Buffer.concat([header, payload]);
}

function createTcpPacket(
  srcPort: number,
  dstPort: number,
  seq: number,
  ack: number,
  flags: { syn?: boolean; ack?: boolean; rst?: boolean; fin?: boolean; psh?: boolean },
  payload: Buffer = Buffer.alloc(0)
): Buffer {
  const header = Buffer.alloc(20);
  header.writeUInt16BE(srcPort, 0);
  header.writeUInt16BE(dstPort, 2);
  header.writeUInt32BE(seq, 4);
  header.writeUInt32BE(ack, 8);
  header[12] = 0x50; // Data offset: 5 (20 bytes)

  let flagByte = 0;
  if (flags.fin) flagByte |= 0x01;
  if (flags.syn) flagByte |= 0x02;
  if (flags.rst) flagByte |= 0x04;
  if (flags.psh) flagByte |= 0x08;
  if (flags.ack) flagByte |= 0x10;
  header[13] = flagByte;

  header.writeUInt16BE(64240, 14); // Window size
  header.writeUInt16BE(0, 16); // Checksum
  header.writeUInt16BE(0, 18); // Urgent pointer
  return Buffer.concat([header, payload]);
}

function createIcmpPacket(type: number, code: number, payload: Buffer = Buffer.alloc(32)): Buffer {
  const header = Buffer.alloc(8);
  header[0] = type;
  header[1] = code;
  header.writeUInt16BE(0, 2); // Checksum
  header.writeUInt16BE(0x1234, 4); // Identifier
  header.writeUInt16BE(0x0001, 6); // Sequence number
  return Buffer.concat([header, payload]);
}

function encodeDnsName(name: string): Buffer {
  const parts = name.split('.');
  const buffers: Buffer[] = [];
  for (const part of parts) {
    const lenBuf = Buffer.from([part.length]);
    const textBuf = Buffer.from(part, 'ascii');
    buffers.push(lenBuf, textBuf);
  }
  buffers.push(Buffer.from([0])); // null terminator
  return Buffer.concat(buffers);
}

function createDnsMessage(
  txId: number,
  isResponse: boolean,
  rcode: number,
  queryName: string,
  resolvedIp?: string
): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(txId, 0);

  // Flags
  let flags = 0x0100; // Standard query, RD=1
  if (isResponse) {
    flags = 0x8180 | (rcode & 0x0f); // QR=1, RD=1, RA=1, RCODE
  }
  header.writeUInt16BE(flags, 2);
  header.writeUInt16BE(1, 4); // QDCOUNT = 1
  header.writeUInt16BE(isResponse && resolvedIp ? 1 : 0, 6); // ANCOUNT
  header.writeUInt16BE(0, 8); // NSCOUNT
  header.writeUInt16BE(0, 10); // ARCOUNT

  const qNameBuf = encodeDnsName(queryName);
  const qTypeClass = Buffer.alloc(4);
  qTypeClass.writeUInt16BE(1, 0); // Type A
  qTypeClass.writeUInt16BE(1, 2); // Class IN

  const question = Buffer.concat([qNameBuf, qTypeClass]);

  let answer = Buffer.alloc(0);
  if (isResponse && resolvedIp && rcode === 0) {
    const ansHeader = Buffer.alloc(12);
    ansHeader.writeUInt16BE(0xc00c, 0); // Compression pointer to qname
    ansHeader.writeUInt16BE(1, 2);      // Type A
    ansHeader.writeUInt16BE(1, 4);      // Class IN
    ansHeader.writeUInt32BE(300, 6);    // TTL 300s
    ansHeader.writeUInt16BE(4, 10);     // Data len = 4 bytes
    answer = Buffer.concat([ansHeader, ipToBuffer(resolvedIp)]);
  }

  return Buffer.concat([header, question, answer]);
}

// Generate Scenarios
async function generateAllScenarios() {
  const outDir = path.resolve(process.cwd(), 'network-lab/captures');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const baseSec = Math.floor(Date.now() / 1000) - 3600;

  // 1. Scenario 1 - Normal
  {
    const p = new PcapBuilder();
    // DNS Query
    const dnsReq = createDnsMessage(0x1001, false, 0, 'srv.lab.local');
    const udp1 = createUdpPacket(52140, 53, dnsReq);
    const ip1 = createIpv4Packet('192.168.10.5', '192.168.20.10', 17, udp1);
    const eth1 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip1);
    p.addPacket(eth1, baseSec + 0.01);

    // DNS Reply
    const dnsResp = createDnsMessage(0x1001, true, 0, 'srv.lab.local', '192.168.20.50');
    const udp2 = createUdpPacket(53, 52140, dnsResp);
    const ip2 = createIpv4Packet('192.168.20.10', '192.168.10.5', 17, udp2);
    const eth2 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip2);
    p.addPacket(eth2, baseSec + 0.03);

    // TCP SYN
    const tcpSyn = createTcpPacket(49152, 80, 1000, 0, { syn: true });
    const ip3 = createIpv4Packet('192.168.10.5', '192.168.20.50', 6, tcpSyn);
    const eth3 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip3);
    p.addPacket(eth3, baseSec + 0.05);

    // TCP SYN-ACK
    const tcpSynAck = createTcpPacket(80, 49152, 2000, 1001, { syn: true, ack: true });
    const ip4 = createIpv4Packet('192.168.20.50', '192.168.10.5', 6, tcpSynAck);
    const eth4 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip4);
    p.addPacket(eth4, baseSec + 0.07);

    // TCP ACK
    const tcpAck = createTcpPacket(49152, 80, 1001, 2001, { ack: true });
    const ip5 = createIpv4Packet('192.168.10.5', '192.168.20.50', 6, tcpAck);
    const eth5 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip5);
    p.addPacket(eth5, baseSec + 0.08);

    // HTTP GET
    const httpReq = Buffer.from('GET / HTTP/1.1\r\nHost: srv.lab.local\r\n\r\n');
    const tcpData = createTcpPacket(49152, 80, 1001, 2001, { ack: true, psh: true }, httpReq);
    const ip6 = createIpv4Packet('192.168.10.5', '192.168.20.50', 6, tcpData);
    const eth6 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip6);
    p.addPacket(eth6, baseSec + 0.10);

    fs.writeFileSync(path.join(outDir, 'scenario-1-normal.pcap'), p.toBuffer());
  }

  // 2. Scenario 2 - DHCP Failure (APIPA)
  {
    const p = new PcapBuilder();
    // DHCP Discover broadcast (UDP 68 -> 67, 0.0.0.0 -> 255.255.255.255)
    for (let i = 0; i < 3; i++) {
      const dhcpPayload = Buffer.alloc(240);
      dhcpPayload[0] = 0x01; // BOOTREQUEST
      dhcpPayload[1] = 0x01; // Ethernet
      dhcpPayload[2] = 0x06; // MAC length
      const udp = createUdpPacket(68, 67, dhcpPayload);
      const ip = createIpv4Packet('0.0.0.0', '255.255.255.255', 17, udp);
      const eth = createEthernetFrame('ff:ff:ff:ff:ff:ff', '00:0c:29:11:22:33', 0x0800, ip);
      p.addPacket(eth, baseSec + i * 2.0);
    }
    // ARP Probe for APIPA 169.254.45.12
    const arpPayload = Buffer.alloc(28);
    arpPayload.writeUInt16BE(1, 0); // HW: Ethernet
    arpPayload.writeUInt16BE(0x0800, 2); // Proto: IPv4
    arpPayload[4] = 6;
    arpPayload[5] = 4;
    arpPayload.writeUInt16BE(1, 6); // Request
    macToBuffer('00:0c:29:11:22:33').copy(arpPayload, 8);
    ipToBuffer('0.0.0.0').copy(arpPayload, 14);
    macToBuffer('00:00:00:00:00:00').copy(arpPayload, 18);
    ipToBuffer('169.254.45.12').copy(arpPayload, 24);
    const ethArp = createEthernetFrame('ff:ff:ff:ff:ff:ff', '00:0c:29:11:22:33', 0x0806, arpPayload);
    p.addPacket(ethArp, baseSec + 7.0);

    fs.writeFileSync(path.join(outDir, 'scenario-2-dhcp-failure.pcap'), p.toBuffer());
  }

  // 3. Scenario 3 - Gateway Down (ARP Request unanswered)
  {
    const p = new PcapBuilder();
    for (let i = 0; i < 4; i++) {
      const arpPayload = Buffer.alloc(28);
      arpPayload.writeUInt16BE(1, 0); // Ethernet
      arpPayload.writeUInt16BE(0x0800, 2); // IPv4
      arpPayload[4] = 6;
      arpPayload[5] = 4;
      arpPayload.writeUInt16BE(1, 6); // Request
      macToBuffer('00:0c:29:11:22:33').copy(arpPayload, 8);
      ipToBuffer('192.168.10.5').copy(arpPayload, 14);
      macToBuffer('00:00:00:00:00:00').copy(arpPayload, 18);
      ipToBuffer('192.168.10.1').copy(arpPayload, 24);
      const eth = createEthernetFrame('ff:ff:ff:ff:ff:ff', '00:0c:29:11:22:33', 0x0806, arpPayload);
      p.addPacket(eth, baseSec + i * 1.0);
    }
    fs.writeFileSync(path.join(outDir, 'scenario-3-gateway-down.pcap'), p.toBuffer());
  }

  // 4. Scenario 4 - Routing Failure (ICMP Destination Network Unreachable)
  {
    const p = new PcapBuilder();
    // Echo request to remote subnet 192.168.20.50
    const icmpReq = createIcmpPacket(8, 0);
    const ip1 = createIpv4Packet('192.168.10.5', '192.168.20.50', 1, icmpReq);
    const eth1 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip1);
    p.addPacket(eth1, baseSec + 0.01);

    // Router 192.168.10.1 sends ICMP Type 3 Code 0 (Net Unreachable)
    const icmpUnreach = createIcmpPacket(3, 0);
    const ip2 = createIpv4Packet('192.168.10.1', '192.168.10.5', 1, icmpUnreach);
    const eth2 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip2);
    p.addPacket(eth2, baseSec + 0.03);

    fs.writeFileSync(path.join(outDir, 'scenario-4-routing-failure.pcap'), p.toBuffer());
  }

  // 5. Scenario 5 - DNS Failure (NXDOMAIN)
  {
    const p = new PcapBuilder();
    // Query
    const dnsReq = createDnsMessage(0x2002, false, 0, 'srv.lab.local');
    const udp1 = createUdpPacket(54120, 53, dnsReq);
    const ip1 = createIpv4Packet('192.168.10.5', '192.168.20.10', 17, udp1);
    const eth1 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip1);
    p.addPacket(eth1, baseSec + 0.01);

    // Response NXDOMAIN (RCODE 3)
    const dnsResp = createDnsMessage(0x2002, true, 3, 'srv.lab.local');
    const udp2 = createUdpPacket(53, 54120, dnsResp);
    const ip2 = createIpv4Packet('192.168.20.10', '192.168.10.5', 17, udp2);
    const eth2 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip2);
    p.addPacket(eth2, baseSec + 0.04);

    fs.writeFileSync(path.join(outDir, 'scenario-5-dns-failure.pcap'), p.toBuffer());
  }

  // 6. Scenario 6 - Service Closed (Ping OK, TCP RST)
  {
    const p = new PcapBuilder();
    // Echo request
    const icmpReq = createIcmpPacket(8, 0);
    const ip1 = createIpv4Packet('192.168.10.5', '192.168.20.50', 1, icmpReq);
    const eth1 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip1);
    p.addPacket(eth1, baseSec + 0.01);

    // Echo reply
    const icmpRep = createIcmpPacket(0, 0);
    const ip2 = createIpv4Packet('192.168.20.50', '192.168.10.5', 1, icmpRep);
    const eth2 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip2);
    p.addPacket(eth2, baseSec + 0.03);

    // TCP SYN to port 80
    const tcpSyn = createTcpPacket(51000, 80, 5000, 0, { syn: true });
    const ip3 = createIpv4Packet('192.168.10.5', '192.168.20.50', 6, tcpSyn);
    const eth3 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip3);
    p.addPacket(eth3, baseSec + 0.05);

    // TCP RST / ACK (Connection Refused)
    const tcpRst = createTcpPacket(80, 51000, 0, 5001, { rst: true, ack: true });
    const ip4 = createIpv4Packet('192.168.20.50', '192.168.10.5', 6, tcpRst);
    const eth4 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip4);
    p.addPacket(eth4, baseSec + 0.07);

    fs.writeFileSync(path.join(outDir, 'scenario-6-service-closed.pcap'), p.toBuffer());
  }

  // 7. Scenario 7 - Congestion (Retransmissions)
  {
    const p = new PcapBuilder();
    // SYN 1
    const syn1 = createTcpPacket(52000, 80, 8000, 0, { syn: true });
    const ip1 = createIpv4Packet('192.168.10.5', '192.168.20.50', 6, syn1);
    const eth1 = createEthernetFrame('00:0c:29:aa:bb:cc', '00:0c:29:11:22:33', 0x0800, ip1);
    p.addPacket(eth1, baseSec + 0.0);

    // SYN 2 (Retransmission after timeout)
    p.addPacket(eth1, baseSec + 1.0);

    // SYN 3 (Retransmission after timeout)
    p.addPacket(eth1, baseSec + 3.0);

    // Late SYN-ACK
    const synAck = createTcpPacket(80, 52000, 9000, 8001, { syn: true, ack: true });
    const ip2 = createIpv4Packet('192.168.20.50', '192.168.10.5', 6, synAck);
    const eth2 = createEthernetFrame('00:0c:29:11:22:33', '00:0c:29:aa:bb:cc', 0x0800, ip2);
    p.addPacket(eth2, baseSec + 3.25);

    fs.writeFileSync(path.join(outDir, 'scenario-7-congestion.pcap'), p.toBuffer());
  }

  console.log(`Successfully generated 7 educational scenario PCAPs in ${outDir}`);
}

generateAllScenarios().catch(console.error);
