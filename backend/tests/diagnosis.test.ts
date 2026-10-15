import { describe, it, expect } from 'vitest';
import { DiagnosisEngine, DiagnosticObservation } from '../src/diagnosis/diagnosisEngine.js';

describe('DiagnosisEngine Rules and Evidence Correlation', () => {
  it('diagnoses physical/interface failure when NIC is down', () => {
    const obs: DiagnosticObservation[] = [
      {
        testName: 'Interface Check',
        stage: 'INTERFACE',
        status: 'FAIL',
        evidenceSource: 'LIVE_TEST',
        details: 'No active IPv4 interface found (APIPA or cable disconnected)',
      },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.overallStatus).toBe('DISCONNECTED_OR_FAILED');
    expect(report.mostLikelyFailurePoint).toBe('PHYSICAL_OR_LOCAL_INTERFACE');
    expect(report.confidence).toBe('HIGH');
  });

  it('diagnoses default gateway failure when interface is up but gateway fails', () => {
    const obs: DiagnosticObservation[] = [
      { testName: 'Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'IP 192.168.1.5' },
      { testName: 'Gateway Ping', stage: 'GATEWAY', status: 'FAIL', evidenceSource: 'LIVE_TEST', details: '192.168.1.1 100% packet loss' },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.mostLikelyFailurePoint).toBe('DEFAULT_GATEWAY');
    expect(report.overallStatus).toBe('DISCONNECTED_OR_FAILED');
  });

  it('diagnoses DNS resolution failure when gateway passes but DNS fails', () => {
    const obs: DiagnosticObservation[] = [
      { testName: 'Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'IP valid' },
      { testName: 'Gateway Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'Gateway responded' },
      { testName: 'DNS Lookup', stage: 'DNS', status: 'FAIL', evidenceSource: 'LIVE_TEST', details: 'ENOTFOUND NXDOMAIN' },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.mostLikelyFailurePoint).toBe('DNS_RESOLUTION');
    expect(report.overallStatus).toBe('DISCONNECTED_OR_FAILED');
    expect(report.alternativeExplanations.length).toBeGreaterThan(0);
  });

  it('diagnoses target service port down when L3 routing passes but TCP handshake fails', () => {
    const obs: DiagnosticObservation[] = [
      { testName: 'Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'IP valid' },
      { testName: 'Gateway Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'Gateway responded' },
      { testName: 'DNS Lookup', stage: 'DNS', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'Resolved to 10.0.0.5' },
      { testName: 'Target Ping', stage: 'ROUTING', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'ICMP echo reply received' },
      { testName: 'TCP Port 80', stage: 'TRANSPORT', status: 'FAIL', evidenceSource: 'LIVE_TEST', details: 'ECONNREFUSED TCP RST' },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.mostLikelyFailurePoint).toBe('TARGET_SERVICE_PORT');
    expect(report.primaryHeadline).toContain('Service Port');
  });

  it('identifies network congestion and packet loss', () => {
    const obs: DiagnosticObservation[] = [
      { testName: 'Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'IP valid' },
      { testName: 'Gateway Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'Gateway responded' },
      { testName: 'Ping to Target', stage: 'ROUTING', status: 'WARNING', evidenceSource: 'LIVE_TEST', details: '35% packet loss, high jitter' },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.overallStatus).toBe('CONNECTED_DEGRADED');
    expect(report.mostLikelyFailurePoint).toBe('NETWORK_CONGESTION_PACKET_LOSS');
  });

  it('returns healthy status when all tests pass', () => {
    const obs: DiagnosticObservation[] = [
      { testName: 'Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'OK' },
      { testName: 'Gateway Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'OK' },
      { testName: 'DNS Lookup', stage: 'DNS', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'OK' },
      { testName: 'TCP Handshake', stage: 'TRANSPORT', status: 'PASS', evidenceSource: 'LIVE_TEST', details: 'OK' },
    ];

    const report = DiagnosisEngine.evaluate('srv.lab.local', obs, 'LIVE_TEST');
    expect(report.overallStatus).toBe('CONNECTED_AND_HEALTHY');
    expect(report.mostLikelyFailurePoint).toBe('NONE_HEALTHY');
  });

  it('returns INCONCLUSIVE when observations are empty', () => {
    const report = DiagnosisEngine.evaluate('unknown.host', [], 'LIVE_TEST');
    expect(report.overallStatus).toBe('INCONCLUSIVE');
    expect(report.confidence).toBe('LOW');
  });
});
