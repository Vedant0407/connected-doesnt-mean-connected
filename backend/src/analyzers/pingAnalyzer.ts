import { safeExec } from '../utils/exec.js';
import { Logger } from '../utils/logger.js';

export interface PingAnalysisResult {
  target: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE';
  packetsTransmitted: number;
  packetsReceived: number;
  packetLossPercent: number;
  roundTripMs: {
    min?: number;
    avg?: number;
    max?: number;
  };
  durationMs: number;
  rawOutput: string;
  details: string;
  limitations: string;
}

export async function analyzePing(
  target: string,
  count: number = 3,
  timeoutMs: number = 5000
): Promise<PingAnalysisResult> {
  const isWindows = process.platform === 'win32';
  const args = isWindows
    ? ['-n', String(count), '-w', '1500', target]
    : ['-c', String(count), '-W', '2', target];

  const execRes = await safeExec('ping', args, timeoutMs);
  const output = execRes.stdout + '\n' + execRes.stderr;

  let transmitted = count;
  let received = 0;
  let loss = 100;
  let min: number | undefined;
  let avg: number | undefined;
  let max: number | undefined;

  if (isWindows) {
    // Windows ping output parsing
    // Sent = 3, Received = 3, Lost = 0 (0% loss)
    const statsMatch = output.match(/Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+),\s*Lost\s*=\s*(\d+)\s*\((\d+)%\s*loss\)/i);
    if (statsMatch) {
      transmitted = parseInt(statsMatch[1], 10);
      received = parseInt(statsMatch[2], 10);
      loss = parseInt(statsMatch[4], 10);
    }

    // Minimum = 12ms, Maximum = 18ms, Average = 14ms
    const rttMatch = output.match(/Minimum\s*=\s*(\d+)ms,\s*Maximum\s*=\s*(\d+)ms,\s*Average\s*=\s*(\d+)ms/i);
    if (rttMatch) {
      min = parseInt(rttMatch[1], 10);
      max = parseInt(rttMatch[2], 10);
      avg = parseInt(rttMatch[3], 10);
    }
  } else {
    // Unix ping output parsing
    // 3 packets transmitted, 3 received, 0% packet loss
    const statsMatch = output.match(/(\d+)\s+packets transmitted,\s+(\d+)\s+(?:packets\s+)?received,\s+(\d+(?:\.\d+)?)%\s+packet loss/i);
    if (statsMatch) {
      transmitted = parseInt(statsMatch[1], 10);
      received = parseInt(statsMatch[2], 10);
      loss = parseFloat(statsMatch[3]);
    }

    // rtt min/avg/max/mdev = 12.3/14.5/18.2/2.1 ms
    const rttMatch = output.match(/(?:rtt|round-trip)\s+min\/avg\/max\/(?:mdev|stddev)\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i);
    if (rttMatch) {
      min = parseFloat(rttMatch[1]);
      avg = parseFloat(rttMatch[2]);
      max = parseFloat(rttMatch[3]);
    }
  }

  let status: 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE' = 'FAIL';
  let details = '';

  if (received === transmitted && loss === 0) {
    status = 'PASS';
    details = `ICMP ping to ${target} succeeded: ${received}/${transmitted} packets received (0% loss), avg RTT ${avg ?? 'N/A'}ms.`;
  } else if (received > 0 && received < transmitted) {
    status = 'WARNING';
    details = `Degraded ICMP connectivity to ${target}: ${loss}% packet loss (${received}/${transmitted} received). Network may be experiencing congestion, buffer bloat, or intermittent link degradation.`;
  } else {
    status = 'FAIL';
    if (output.includes('Destination host unreachable')) {
      details = `Ping to ${target} failed with "Destination host unreachable". An intermediate router dropped the packet because it has no route or ARP resolution failed on the local subnet.`;
    } else if (output.includes('Request timed out') || output.includes('100% loss')) {
      details = `Ping to ${target} timed out (100% packet loss). Either the target host is offline, or a firewall/router along the path is silently dropping ICMP echo requests.`;
    } else {
      details = `Ping to ${target} failed: No ICMP echo reply received.`;
    }
  }

  return {
    target,
    status,
    packetsTransmitted: transmitted,
    packetsReceived: received,
    packetLossPercent: loss,
    roundTripMs: { min, avg, max },
    durationMs: execRes.durationMs,
    rawOutput: output.trim(),
    details,
    limitations: 'IMPORTANT: A failed ICMP ping does NOT prove a host is down or offline. Many modern operating systems, cloud providers (like AWS/Azure), and edge firewalls intentionally filter ICMP by default while keeping HTTP/HTTPS (ports 80/443) fully operational.',
  };
}
