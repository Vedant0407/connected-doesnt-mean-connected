import { safeExec } from '../utils/exec.js';
import { Logger } from '../utils/logger.js';

export interface TracerouteHop {
  hop: number;
  ip?: string;
  rttMs: number[];
  timedOut: boolean;
}

export interface TracerouteAnalysisResult {
  target: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'INCONCLUSIVE';
  hops: TracerouteHop[];
  destinationReached: boolean;
  totalHops: number;
  durationMs: number;
  details: string;
  limitations: string;
}

export async function analyzeTraceroute(
  target: string,
  maxHops: number = 15,
  timeoutMs: number = 18000
): Promise<TracerouteAnalysisResult> {
  const isWindows = process.platform === 'win32';
  const args = isWindows
    ? ['-d', '-h', String(maxHops), '-w', '800', target]
    : ['-n', '-m', String(maxHops), '-w', '1', target];

  const command = isWindows ? 'tracert' : 'traceroute';
  const execRes = await safeExec(command, args, timeoutMs);
  const output = execRes.stdout + '\n' + execRes.stderr;

  const hops: TracerouteHop[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Example Windows line: 1    <1 ms    <1 ms    <1 ms  192.168.1.1
    // Example Windows line: 2     *        *        *     Request timed out.
    // Example Windows line: 3    12 ms    11 ms    13 ms  10.20.30.1
    const winMatch = trimmed.match(/^(\d+)\s+([<*\d\s\w]+?)\s+((?:\d{1,3}\.){3}\d{1,3}|Request timed out\.|\*)$/i);
    if (winMatch) {
      const hopNum = parseInt(winMatch[1], 10);
      const ipOrStatus = winMatch[3];
      const isTimeout = ipOrStatus.includes('timed out') || ipOrStatus === '*';

      const rttMatches = winMatch[2].match(/(?:<1|\d+)\s*ms/g);
      const rtts: number[] = [];
      if (rttMatches) {
        for (const m of rttMatches) {
          if (m.includes('<1')) rtts.push(0.5);
          else {
            const num = parseInt(m, 10);
            if (!isNaN(num)) rtts.push(num);
          }
        }
      }

      hops.push({
        hop: hopNum,
        ip: isTimeout ? undefined : ipOrStatus,
        rttMs: rtts,
        timedOut: isTimeout,
      });
      continue;
    }

    // Unix style line: 1  192.168.1.1  0.512 ms  0.488 ms  0.472 ms
    const unixMatch = trimmed.match(/^(\d+)\s+((?:\d{1,3}\.){3}\d{1,3}|\*)\s+([<*\d\s\w.]+)/i);
    if (unixMatch) {
      const hopNum = parseInt(unixMatch[1], 10);
      const ipOrStar = unixMatch[2];
      const isTimeout = ipOrStar === '*';
      const rttMatches = unixMatch[3].match(/[\d.]+\s*ms/g);
      const rtts = rttMatches ? rttMatches.map((r) => parseFloat(r)).filter((n) => !isNaN(n)) : [];

      hops.push({
        hop: hopNum,
        ip: isTimeout ? undefined : ipOrStar,
        rttMs: rtts,
        timedOut: isTimeout,
      });
    }
  }

  const destinationReached = hops.some((h) => h.ip === target);
  let status: 'PASS' | 'WARNING' | 'FAIL' | 'INCONCLUSIVE' = 'FAIL';
  let details = '';

  if (destinationReached) {
    status = 'PASS';
    details = `Traceroute successfully reached target ${target} in ${hops.length} hop(s).`;
  } else if (hops.length > 0) {
    const lastHopWithIp = [...hops].reverse().find((h) => h.ip);
    if (lastHopWithIp) {
      status = 'WARNING';
      details = `Traceroute traced ${hops.length} hop(s) with last responding router at Hop ${lastHopWithIp.hop} (${lastHopWithIp.ip}). Packets did not complete to destination ${target} within ${maxHops} hops.`;
    } else {
      status = 'FAIL';
      details = `Traceroute failed immediately; no gateway or intermediate hops responded.`;
    }
  } else {
    status = execRes.timedOut ? 'WARNING' : 'INCONCLUSIVE';
    details = execRes.timedOut
      ? 'Traceroute exceeded overall execution timeout.'
      : 'Traceroute produced inconclusive output.';
  }

  return {
    target,
    status,
    hops,
    destinationReached,
    totalHops: hops.length,
    durationMs: execRes.durationMs,
    details,
    limitations: 'A failed traceroute does NOT automatically prove a network routing outage. Many transit ISPs and cloud edge routers disable ICMP Time Exceeded (TTL expired) generation for security and rate-limiting reasons, creating asterisks (*) even when traffic is flowing normally.',
  };
}
