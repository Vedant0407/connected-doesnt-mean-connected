import dns from 'dns';
import { Logger } from '../utils/logger.js';

export interface DnsAnalysisResult {
  target: string;
  dnsServerUsed: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE';
  addresses: string[];
  records: {
    ipv4: string[];
    ipv6: string[];
    cname?: string[];
  };
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
  details: string;
  limitations: string;
}

export async function analyzeDns(
  target: string,
  customDnsServer?: string,
  timeoutMs: number = 4000
): Promise<DnsAnalysisResult> {
  const startTime = Date.now();
  const resolver = new dns.promises.Resolver({ timeout: timeoutMs, tries: 2 });

  if (customDnsServer) {
    try {
      resolver.setServers([customDnsServer]);
    } catch (e: any) {
      Logger.warn(`Invalid custom DNS server ${customDnsServer}: ${e.message}`);
    }
  }

  const dnsServers = resolver.getServers();
  const primaryServer = dnsServers.length > 0 ? dnsServers[0] : 'System Default';

  // Check if target is already an IP address
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(target);
  const isIpv6 = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(target);

  if (isIpv4 || isIpv6) {
    const duration = Date.now() - startTime;
    return {
      target,
      dnsServerUsed: primaryServer,
      status: 'PASS',
      addresses: [target],
      records: {
        ipv4: isIpv4 ? [target] : [],
        ipv6: isIpv6 ? [target] : [],
      },
      durationMs: duration,
      details: `Target "${target}" is already a literal IP address; DNS lookup skipped.`,
      limitations: 'Direct IP usage bypasses DNS name resolution entirely.',
    };
  }

  const ipv4List: string[] = [];
  const ipv6List: string[] = [];
  const cnameList: string[] = [];
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  try {
    const aPromise = resolver.resolve4(target).then((ips) => ipv4List.push(...ips)).catch((err) => err);
    const aaaaPromise = resolver.resolve6(target).then((ips) => ipv6List.push(...ips)).catch((err) => err);
    const cnamePromise = resolver.resolveCname(target).then((names) => cnameList.push(...names)).catch((err) => err);

    await Promise.allSettled([aPromise, aaaaPromise, cnamePromise]);

    const duration = Date.now() - startTime;

    if (ipv4List.length > 0 || ipv6List.length > 0) {
      const allAddresses = [...ipv4List, ...ipv6List];
      return {
        target,
        dnsServerUsed: primaryServer,
        status: 'PASS',
        addresses: allAddresses,
        records: {
          ipv4: ipv4List,
          ipv6: ipv6List,
          cname: cnameList.length > 0 ? cnameList : undefined,
        },
        durationMs: duration,
        details: `Successfully resolved "${target}" to ${allAddresses.length} IP address(es) via DNS server ${primaryServer} in ${duration}ms.`,
        limitations: 'Successful DNS resolution verifies that the authoritative name server has mapped the hostname to an IP. It does NOT guarantee that the server at that IP is reachable or that services on it are running.',
      };
    } else {
      // Both IPv4 and IPv6 lookups failed or yielded empty
      let explanation = `Domain "${target}" could not be resolved.`;
      try {
        await resolver.resolve4(target);
      } catch (err: any) {
        errorCode = err.code || 'UNKNOWN_ERROR';
        errorMessage = err.message;

        if (err.code === 'ENOTFOUND') {
          explanation = `DNS lookup failed (NXDOMAIN / ENOTFOUND). The hostname "${target}" does not exist in DNS or cannot be found by server ${primaryServer}.`;
        } else if (err.code === 'ETIMEOUT') {
          explanation = `DNS query timed out after ${timeoutMs}ms trying to reach DNS server ${primaryServer}. The DNS server may be down, congested, or blocked by a firewall.`;
        } else if (err.code === 'ESERVFAIL') {
          explanation = `DNS server ${primaryServer} returned SERVFAIL. The upstream authoritative server could not be reached or experienced an internal failure.`;
        } else if (err.code === 'EREFUSED') {
          explanation = `DNS server ${primaryServer} refused the query. Recursive queries may be disallowed or blocked.`;
        }
      }

      return {
        target,
        dnsServerUsed: primaryServer,
        status: 'FAIL',
        addresses: [],
        records: { ipv4: [], ipv6: [] },
        durationMs: Date.now() - startTime,
        errorCode,
        errorMessage,
        details: explanation,
        limitations: 'A DNS failure prevents hostname-based connections even if the underlying physical network and default gateway are perfectly operational.',
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      target,
      dnsServerUsed: primaryServer,
      status: 'FAIL',
      addresses: [],
      records: { ipv4: [], ipv6: [] },
      durationMs: duration,
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message,
      details: `DNS resolution failed unexpectedly: ${error.message}`,
      limitations: 'DNS lookup failure indicates a name resolution issue, but does not diagnose downstream transport layers.',
    };
  }
}
