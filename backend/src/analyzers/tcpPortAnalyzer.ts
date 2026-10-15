import net from 'net';
import { Logger } from '../utils/logger.js';

export interface TcpPortAnalysisResult {
  host: string;
  port: number;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE';
  isOpen: boolean;
  handshakeTimeMs: number;
  errorCode?: string;
  details: string;
  limitations: string;
}

export async function analyzeTcpPort(
  host: string,
  port: number,
  timeoutMs: number = 4000
): Promise<TcpPortAnalysisResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      if (isResolved) return;
      isResolved = true;
      const duration = Date.now() - startTime;
      cleanup();
      resolve({
        host,
        port,
        status: 'PASS',
        isOpen: true,
        handshakeTimeMs: duration,
        details: `TCP connection to ${host}:${port} succeeded (SYN-ACK received and ACK transmitted) in ${duration}ms.`,
        limitations: 'A successful TCP handshake only confirms Layer 4 transport connectivity. It does NOT guarantee that the application layer (e.g., HTTP server, TLS handshake, or backend API) is functioning properly.',
      });
    });

    socket.on('timeout', () => {
      if (isResolved) return;
      isResolved = true;
      const duration = Date.now() - startTime;
      cleanup();
      resolve({
        host,
        port,
        status: 'FAIL',
        isOpen: false,
        handshakeTimeMs: duration,
        errorCode: 'ETIMEDOUT',
        details: `TCP SYN to ${host}:${port} timed out after ${timeoutMs}ms without receiving a SYN-ACK. Packets may have been dropped by an intermediate firewall, router, or the target host.`,
        limitations: 'A connection timeout typically indicates packet loss or silent packet dropping by a stateful firewall, security group, or routing blackhole.',
      });
    });

    socket.on('error', (err: any) => {
      if (isResolved) return;
      isResolved = true;
      const duration = Date.now() - startTime;
      cleanup();

      const code = err.code || 'UNKNOWN';
      let details = `TCP connection to ${host}:${port} failed: ${err.message}`;

      if (code === 'ECONNREFUSED') {
        details = `TCP connection refused (RST received) by ${host}:${port}. The host is reachable on the network, but no service is listening on port ${port}, or a local firewall actively rejected the socket.`;
      } else if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
        details = `Host or network unreachable when attempting to connect to ${host}:${port}. Routing table or intermediate gateway does not have a valid route to this destination.`;
      }

      resolve({
        host,
        port,
        status: 'FAIL',
        isOpen: false,
        handshakeTimeMs: duration,
        errorCode: code,
        details,
        limitations: 'An active connection refusal proves Layer 3 reachability to the target IP, isolating the failure strictly to Layer 4/7 (service port or firewall).',
      });
    });
  });
}
