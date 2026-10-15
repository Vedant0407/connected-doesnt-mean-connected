import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { parseCaptureFile, parseWithNativeParser } from '../src/analyzers/pcapParser.js';

describe('PCAP / PCAPNG Packet Analyzer Engine', () => {
  const capturesDir = path.resolve(process.cwd(), '../network-lab/captures');

  it('rejects truncated capture files (< 24 bytes)', () => {
    const invalidBuf = Buffer.from([0x01, 0x02, 0x03]);
    expect(() => parseWithNativeParser(invalidBuf, 'short.pcap', invalidBuf.length)).toThrow(
      /too small/i
    );
  });

  it('rejects capture files with invalid magic headers', () => {
    const invalidBuf = Buffer.alloc(32);
    invalidBuf.writeUInt32BE(0x12345678, 0);
    expect(() => parseWithNativeParser(invalidBuf, 'bad_magic.pcap', invalidBuf.length)).toThrow(
      /unsupported capture format/i
    );
  });

  it('parses scenario-1-normal.pcap with DNS, TCP, and HTTP frames', async () => {
    const filePath = path.join(capturesDir, 'scenario-1-normal.pcap');
    if (!fs.existsSync(filePath)) return;

    const result = await parseCaptureFile(filePath);
    expect(result.totalPackets).toBeGreaterThanOrEqual(6);
    expect(result.protocolBreakdown['DNS']).toBeGreaterThanOrEqual(2);
    const tcpOrHttp = (result.protocolBreakdown['TCP'] || 0) + (result.protocolBreakdown['HTTP'] || 0);
    expect(tcpOrHttp).toBeGreaterThanOrEqual(2);
    expect(result.dnsSummary.queriesCount).toBeGreaterThanOrEqual(1);
    expect(result.dnsSummary.responsesCount).toBeGreaterThanOrEqual(1);
  });

  it('parses scenario-4-routing-failure.pcap with ICMP Destination Unreachable', async () => {
    const filePath = path.join(capturesDir, 'scenario-4-routing-failure.pcap');
    if (!fs.existsSync(filePath)) return;

    const result = await parseCaptureFile(filePath);
    expect(result.totalPackets).toBeGreaterThanOrEqual(2);
    expect(result.icmpSummary.unreachableCount).toBeGreaterThanOrEqual(1);
    expect(result.keyFindings.some((f) => f.includes('Destination Unreachable'))).toBe(true);
  });

  it('parses scenario-5-dns-failure.pcap with NXDOMAIN response', async () => {
    const filePath = path.join(capturesDir, 'scenario-5-dns-failure.pcap');
    if (!fs.existsSync(filePath)) return;

    const result = await parseCaptureFile(filePath);
    expect(result.dnsSummary.errorResponses.length).toBeGreaterThanOrEqual(1);
    expect(result.dnsSummary.errorResponses[0].rcodeName).toBe('NXDOMAIN');
  });

  it('parses scenario-6-service-closed.pcap with TCP RST flag', async () => {
    const filePath = path.join(capturesDir, 'scenario-6-service-closed.pcap');
    if (!fs.existsSync(filePath)) return;

    const result = await parseCaptureFile(filePath);
    expect(result.tcpSummary.resets).toBeGreaterThanOrEqual(1);
    expect(result.keyFindings.some((f) => f.includes('TCP RST'))).toBe(true);
  });
});
