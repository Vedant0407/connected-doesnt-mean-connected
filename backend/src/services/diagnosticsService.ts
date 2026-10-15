import { analyzeLocalNetwork } from '../analyzers/interfaceAnalyzer.js';
import { analyzeDns } from '../analyzers/dnsAnalyzer.js';
import { analyzePing } from '../analyzers/pingAnalyzer.js';
import { analyzeTraceroute } from '../analyzers/tracerouteAnalyzer.js';
import { analyzeTcpPort } from '../analyzers/tcpPortAnalyzer.js';
import {
  ComprehensiveDiagnosisReport,
  DiagnosisEngine,
  DiagnosticObservation,
} from '../diagnosis/diagnosisEngine.js';
import { DatabaseService } from './databaseService.js';
import { Logger } from '../utils/logger.js';

export interface DiagnosticRunOptions {
  target: string;
  testType?: 'QUICK' | 'COMPREHENSIVE' | 'DNS_ONLY' | 'TCP_PORT_ONLY' | 'GATEWAY_ONLY' | 'TRACEROUTE_ONLY';
  customDnsServer?: string;
  tcpPort?: number;
  runTraceroute?: boolean;
}

export class DiagnosticsService {
  public static async runDiagnostics(
    options: DiagnosticRunOptions
  ): Promise<ComprehensiveDiagnosisReport> {
    const { target, testType = 'COMPREHENSIVE', customDnsServer, tcpPort = 80, runTraceroute = false } = options;
    const observations: DiagnosticObservation[] = [];

    Logger.info(`Starting live network diagnostic for target: "${target}" [Mode: ${testType}]`);

    // 1. Local Network Interface & Default Gateway Inspection
    try {
      const netState = await analyzeLocalNetwork();
      observations.push({
        testName: 'Local Network Interface',
        stage: 'INTERFACE',
        status: netState.status === 'PASS' ? 'PASS' : netState.status === 'WARNING' ? 'WARNING' : 'FAIL',
        evidenceSource: 'LIVE_TEST',
        details: netState.details,
        limitations: netState.limitations,
      });

      // 2. Gateway Reachability Ping
      if (netState.defaultGateway) {
        try {
          const gwPing = await analyzePing(netState.defaultGateway, 3, 3500);
          observations.push({
            testName: `Default Gateway Ping (${netState.defaultGateway})`,
            stage: 'GATEWAY',
            status: gwPing.status,
            evidenceSource: 'LIVE_TEST',
            details: gwPing.details,
            metric: gwPing.roundTripMs.avg ? `${gwPing.roundTripMs.avg}ms` : undefined,
            limitations: gwPing.limitations,
          });
        } catch (gwErr: any) {
          observations.push({
            testName: 'Default Gateway Ping',
            stage: 'GATEWAY',
            status: 'FAIL',
            evidenceSource: 'LIVE_TEST',
            details: `Failed pinging gateway ${netState.defaultGateway}: ${gwErr.message}`,
          });
        }
      } else {
        observations.push({
          testName: 'Default Gateway Ping',
          stage: 'GATEWAY',
          status: 'WARNING',
          evidenceSource: 'LIVE_TEST',
          details: 'No default gateway discovered on local network interfaces.',
        });
      }
    } catch (err: any) {
      observations.push({
        testName: 'Local Network Interface',
        stage: 'INTERFACE',
        status: 'FAIL',
        evidenceSource: 'LIVE_TEST',
        details: `Interface inspection failed: ${err.message}`,
      });
    }

    if (testType === 'GATEWAY_ONLY') {
      const report = DiagnosisEngine.evaluate(target, observations, 'LIVE_TEST');
      await DatabaseService.saveRecord(report, testType);
      return report;
    }

    // 3. DNS Name Resolution
    let resolvedIp: string | undefined;
    try {
      const dnsResult = await analyzeDns(target, customDnsServer);
      observations.push({
        testName: `DNS Resolution (${target})`,
        stage: 'DNS',
        status: dnsResult.status,
        evidenceSource: 'LIVE_TEST',
        details: dnsResult.details,
        metric: `${dnsResult.durationMs}ms`,
        limitations: dnsResult.limitations,
      });

      if (dnsResult.addresses.length > 0) {
        resolvedIp = dnsResult.addresses[0];
      }
    } catch (dnsErr: any) {
      observations.push({
        testName: `DNS Resolution (${target})`,
        stage: 'DNS',
        status: 'FAIL',
        evidenceSource: 'LIVE_TEST',
        details: `DNS lookup failed: ${dnsErr.message}`,
      });
    }

    if (testType === 'DNS_ONLY') {
      const report = DiagnosisEngine.evaluate(target, observations, 'LIVE_TEST');
      await DatabaseService.saveRecord(report, testType);
      return report;
    }

    // Target for Layer 3/4 tests: Use resolved IP or target directly if already IP/domain
    const pingTarget = resolvedIp || target;

    // 4. Remote Ping / ICMP Reachability Check
    try {
      const targetPing = await analyzePing(pingTarget, 3, 4000);
      observations.push({
        testName: `Target ICMP Ping (${pingTarget})`,
        stage: 'ROUTING',
        status: targetPing.status,
        evidenceSource: 'LIVE_TEST',
        details: targetPing.details,
        metric: targetPing.roundTripMs.avg ? `${targetPing.roundTripMs.avg}ms` : undefined,
        limitations: targetPing.limitations,
      });
    } catch (pErr: any) {
      observations.push({
        testName: `Target ICMP Ping (${pingTarget})`,
        stage: 'ROUTING',
        status: 'FAIL',
        evidenceSource: 'LIVE_TEST',
        details: `Ping to ${pingTarget} failed: ${pErr.message}`,
      });
    }

    // 5. Traceroute (if comprehensive and requested or explicit)
    if (runTraceroute || testType === 'TRACEROUTE_ONLY' || (testType === 'COMPREHENSIVE' && runTraceroute)) {
      try {
        const traceRes = await analyzeTraceroute(pingTarget, 10, 15000);
        observations.push({
          testName: `Traceroute Path (${pingTarget})`,
          stage: 'ROUTING',
          status: traceRes.status,
          evidenceSource: 'LIVE_TEST',
          details: traceRes.details,
          metric: `${traceRes.totalHops} hops`,
          limitations: traceRes.limitations,
        });
      } catch (trErr: any) {
        observations.push({
          testName: 'Traceroute Path',
          stage: 'ROUTING',
          status: 'WARNING',
          evidenceSource: 'LIVE_TEST',
          details: `Traceroute error: ${trErr.message}`,
        });
      }
    }

    // 6. TCP Port Handshake Check
    if (tcpPort && tcpPort > 0) {
      try {
        const tcpRes = await analyzeTcpPort(pingTarget, tcpPort, 3500);
        observations.push({
          testName: `TCP Port ${tcpPort} Connection`,
          stage: 'TRANSPORT',
          status: tcpRes.status,
          evidenceSource: 'LIVE_TEST',
          details: tcpRes.details,
          metric: tcpRes.isOpen ? `${tcpRes.handshakeTimeMs}ms` : undefined,
          limitations: tcpRes.limitations,
        });
      } catch (tErr: any) {
        observations.push({
          testName: `TCP Port ${tcpPort} Connection`,
          stage: 'TRANSPORT',
          status: 'FAIL',
          evidenceSource: 'LIVE_TEST',
          details: `TCP check error: ${tErr.message}`,
        });
      }
    }

    const report = DiagnosisEngine.evaluate(target, observations, 'LIVE_TEST');
    await DatabaseService.saveRecord(report, testType);
    return report;
  }
}
