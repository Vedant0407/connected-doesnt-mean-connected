export interface SubnetInfo {
  name?: string;
  networkAddress: string;
  cidr: number;
  subnetMask: string;
  firstUsableIp: string;
  lastUsableIp: string;
  broadcastAddress: string;
  totalHosts: number;
  usableHosts: number;
}

export interface VlsmRequirement {
  name: string;
  requiredHosts: number;
}

export interface VlsmPlanResult {
  baseNetwork: string;
  baseCidr: number;
  subnets: SubnetInfo[];
  totalAllocatedHosts: number;
  hasOverlap: boolean;
  overlaps: Array<{ subnet1: string; subnet2: string }>;
}

export function ipToInt(ip: string): number {
  const octets = ip.trim().split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function intToIp(int: number): string {
  const uInt = int >>> 0;
  return [
    (uInt >>> 24) & 255,
    (uInt >>> 16) & 255,
    (uInt >>> 8) & 255,
    uInt & 255,
  ].join('.');
}

export function cidrToSubnetMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR prefix: /${cidr}. Must be between 0 and 32.`);
  }
  if (cidr === 0) return '0.0.0.0';
  const mask = ((0xffffffff << (32 - cidr)) & 0xffffffff) >>> 0;
  return intToIp(mask);
}

export function subnetMaskToCidr(mask: string): number {
  const maskInt = ipToInt(mask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((maskInt & (1 << i)) !== 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function calculateSubnet(networkIp: string, cidr: number, name?: string): SubnetInfo {
  const ipIntVal = ipToInt(networkIp);
  const maskInt = cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) & 0xffffffff) >>> 0;
  const netInt = (ipIntVal & maskInt) >>> 0;
  const totalHosts = Math.pow(2, 32 - cidr);
  const broadcastInt = (netInt + totalHosts - 1) >>> 0;

  let firstUsableInt = (netInt + 1) >>> 0;
  let lastUsableInt = (broadcastInt - 1) >>> 0;
  let usableHosts = Math.max(0, totalHosts - 2);

  if (cidr === 31) {
    // RFC 3021 Point-to-Point Links
    firstUsableInt = netInt;
    lastUsableInt = broadcastInt;
    usableHosts = 2;
  } else if (cidr === 32) {
    firstUsableInt = netInt;
    lastUsableInt = netInt;
    usableHosts = 1;
  }

  return {
    name,
    networkAddress: intToIp(netInt),
    cidr,
    subnetMask: intToIp(maskInt),
    firstUsableIp: intToIp(firstUsableInt),
    lastUsableIp: intToIp(lastUsableInt),
    broadcastAddress: intToIp(broadcastInt),
    totalHosts,
    usableHosts,
  };
}

export function isIpInSubnet(ip: string, networkIp: string, cidr: number): boolean {
  const ipIntVal = ipToInt(ip);
  const maskInt = cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) & 0xffffffff) >>> 0;
  const targetNet = (ipToInt(networkIp) & maskInt) >>> 0;
  const currentNet = (ipIntVal & maskInt) >>> 0;
  return targetNet === currentNet;
}

export function checkSubnetsOverlap(
  subnets: Array<{ networkIp: string; cidr: number; name?: string }>
): { hasOverlap: boolean; overlaps: Array<{ subnet1: string; subnet2: string }> } {
  const overlaps: Array<{ subnet1: string; subnet2: string }> = [];

  for (let i = 0; i < subnets.length; i++) {
    const s1 = calculateSubnet(subnets[i].networkIp, subnets[i].cidr, subnets[i].name);
    const start1 = ipToInt(s1.networkAddress);
    const end1 = ipToInt(s1.broadcastAddress);

    for (let j = i + 1; j < subnets.length; j++) {
      const s2 = calculateSubnet(subnets[j].networkIp, subnets[j].cidr, subnets[j].name);
      const start2 = ipToInt(s2.networkAddress);
      const end2 = ipToInt(s2.broadcastAddress);

      // Check if ranges intersect
      if (Math.max(start1, start2) <= Math.min(end1, end2)) {
        overlaps.push({
          subnet1: `${s1.name || 'Subnet'} (${s1.networkAddress}/${s1.cidr})`,
          subnet2: `${s2.name || 'Subnet'} (${s2.networkAddress}/${s2.cidr})`,
        });
      }
    }
  }

  return {
    hasOverlap: overlaps.length > 0,
    overlaps,
  };
}

/**
 * VLSM Subnet Planner
 * Sorts requirements in descending order of needed hosts, computes required prefix size,
 * and sequentially allocates non-overlapping blocks from the base network.
 */
export function planVlsm(
  baseNetwork: string,
  baseCidr: number,
  requirements: VlsmRequirement[]
): VlsmPlanResult {
  const sortedReqs = [...requirements].sort((a, b) => b.requiredHosts - a.requiredHosts);
  const allocatedSubnets: SubnetInfo[] = [];

  let currentIpInt = ipToInt(baseNetwork);
  const baseMask = cidrToSubnetMask(baseCidr);
  const baseSubnet = calculateSubnet(baseNetwork, baseCidr);
  const baseStart = ipToInt(baseSubnet.networkAddress);
  const baseEnd = ipToInt(baseSubnet.broadcastAddress);

  for (const req of sortedReqs) {
    // For standard IPv4 subnets, we need hosts + 2 (network & broadcast)
    const neededIps = req.requiredHosts + 2;
    let power = 2;
    while (Math.pow(2, power) < neededIps && power <= 30) {
      power++;
    }
    const prefix = 32 - power;
    const blockSize = Math.pow(2, power);

    // Align currentIpInt to block boundary
    if (currentIpInt % blockSize !== 0) {
      currentIpInt = Math.ceil(currentIpInt / blockSize) * blockSize;
    }

    if (currentIpInt + blockSize - 1 > baseEnd) {
      throw new Error(
        `Insufficient address space in base network ${baseNetwork}/${baseCidr} for requirement "${req.name}" (${req.requiredHosts} hosts)`
      );
    }

    const subnet = calculateSubnet(intToIp(currentIpInt), prefix, req.name);
    allocatedSubnets.push(subnet);
    currentIpInt = (currentIpInt + blockSize) >>> 0;
  }

  const overlapCheck = checkSubnetsOverlap(
    allocatedSubnets.map((s) => ({ networkIp: s.networkAddress, cidr: s.cidr, name: s.name }))
  );

  return {
    baseNetwork,
    baseCidr,
    subnets: allocatedSubnets,
    totalAllocatedHosts: allocatedSubnets.reduce((acc, s) => acc + s.usableHosts, 0),
    hasOverlap: overlapCheck.hasOverlap,
    overlaps: overlapCheck.overlaps,
  };
}
