import os from 'os';
import { safeExec } from '../utils/exec.js';
import { Logger } from '../utils/logger.js';

export interface NetworkInterfaceInfo {
  name: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  netmask: string;
  mac: string;
  internal: boolean;
  cidr?: string;
}

export interface LocalNetworkState {
  interfaces: NetworkInterfaceInfo[];
  primaryInterface?: NetworkInterfaceInfo;
  defaultGateway?: string;
  hostname: string;
  osPlatform: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  details: string;
  limitations: string;
}

/**
 * Determine default gateway on Windows using route print or netstat
 */
async function detectDefaultGatewayWindows(): Promise<string | undefined> {
  try {
    const routeRes = await safeExec('route', ['print', '0.0.0.0'], 3000);
    if (routeRes.stdout) {
      // Look for lines with 0.0.0.0 0.0.0.0 <Gateway-IP> <Interface-IP>
      const lines = routeRes.stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4 && parts[0] === '0.0.0.0' && parts[1] === '0.0.0.0') {
          const gw = parts[2];
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(gw) && gw !== '0.0.0.0') {
            return gw;
          }
        }
      }
    }
  } catch (err: any) {
    Logger.debug(`route print failed: ${err.message}`);
  }

  // Fallback to netstat -rn
  try {
    const netstatRes = await safeExec('netstat', ['-rn'], 3000);
    if (netstatRes.stdout) {
      const lines = netstatRes.stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[0] === '0.0.0.0' && parts[1] === '0.0.0.0') {
          const gw = parts[2];
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(gw) && gw !== '0.0.0.0') {
            return gw;
          }
        }
      }
    }
  } catch (err: any) {
    Logger.debug(`netstat fallback failed: ${err.message}`);
  }

  return undefined;
}

/**
 * Determine default gateway on Linux or macOS
 */
async function detectDefaultGatewayUnix(): Promise<string | undefined> {
  try {
    const res = await safeExec('ip', ['route', 'show', 'default'], 3000);
    if (res.stdout) {
      const match = res.stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) return match[1];
    }
  } catch {}

  try {
    const res = await safeExec('netstat', ['-rn'], 3000);
    if (res.stdout) {
      const lines = res.stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'default' || parts[0] === '0.0.0.0') {
          const gw = parts[1];
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(gw)) return gw;
        }
      }
    }
  } catch {}

  return undefined;
}

export async function analyzeLocalNetwork(): Promise<LocalNetworkState> {
  const osInterfaces = os.networkInterfaces();
  const interfaceList: NetworkInterfaceInfo[] = [];

  for (const [name, addrs] of Object.entries(osInterfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      interfaceList.push({
        name,
        family: addr.family as 'IPv4' | 'IPv6',
        address: addr.address,
        netmask: addr.netmask,
        mac: addr.mac,
        internal: addr.internal,
        cidr: addr.cidr || undefined,
      });
    }
  }

  // Find non-internal IPv4 interfaces
  const externalIpv4 = interfaceList.filter((i) => !i.internal && i.family === 'IPv4');

  const isWindows = process.platform === 'win32';
  let gateway: string | undefined;

  if (isWindows) {
    gateway = await detectDefaultGatewayWindows();
  } else {
    gateway = await detectDefaultGatewayUnix();
  }

  let primaryInterface = externalIpv4.length > 0 ? externalIpv4[0] : undefined;

  let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let details = '';

  if (externalIpv4.length === 0) {
    status = 'FAIL';
    details = 'No active non-loopback network interface detected. The device is physically disconnected or in Airplane mode.';
  } else if (!gateway) {
    status = 'WARNING';
    details = `Active network interface detected (${primaryInterface?.address}), but could not confirm a default gateway route. Local LAN connectivity may work, but remote/Internet routing is likely disabled.`;
  } else {
    status = 'PASS';
    details = `Active network interface "${primaryInterface?.name}" (${primaryInterface?.address}/${primaryInterface?.netmask}) connected with Default Gateway ${gateway}.`;
  }

  return {
    interfaces: interfaceList,
    primaryInterface,
    defaultGateway: gateway,
    hostname: os.hostname(),
    osPlatform: process.platform,
    status,
    details,
    limitations: 'Interface inspection checks local host configuration only. Having a valid IP and gateway assigned does NOT mean the gateway is actually reachable or providing Internet transit.',
  };
}
