import { describe, it, expect } from 'vitest';
import {
  ipToInt,
  intToIp,
  cidrToSubnetMask,
  subnetMaskToCidr,
  calculateSubnet,
  isIpInSubnet,
  checkSubnetsOverlap,
  planVlsm,
} from '../src/utils/subnet.js';

describe('Subnet and VLSM Utilities', () => {
  it('converts IP to integer and back symmetrically', () => {
    const ip = '192.168.1.1';
    const int = ipToInt(ip);
    expect(intToIp(int)).toBe(ip);
  });

  it('calculates subnet mask from CIDR prefix', () => {
    expect(cidrToSubnetMask(24)).toBe('255.255.255.0');
    expect(cidrToSubnetMask(26)).toBe('255.255.255.192');
    expect(cidrToSubnetMask(30)).toBe('255.255.255.252');
  });

  it('calculates CIDR from subnet mask', () => {
    expect(subnetMaskToCidr('255.255.255.0')).toBe(24);
    expect(subnetMaskToCidr('255.255.255.192')).toBe(26);
    expect(subnetMaskToCidr('255.255.255.252')).toBe(30);
  });

  it('correctly computes subnet boundaries for a /26 network', () => {
    const res = calculateSubnet('192.168.10.5', 26);
    expect(res.networkAddress).toBe('192.168.10.0');
    expect(res.broadcastAddress).toBe('192.168.10.63');
    expect(res.firstUsableIp).toBe('192.168.10.1');
    expect(res.lastUsableIp).toBe('192.168.10.62');
    expect(res.usableHosts).toBe(62);
  });

  it('detects IP inclusion in subnet', () => {
    expect(isIpInSubnet('192.168.10.50', '192.168.10.0', 26)).toBe(true);
    expect(isIpInSubnet('192.168.10.70', '192.168.10.0', 26)).toBe(false);
  });

  it('detects overlapping and non-overlapping subnets', () => {
    const overlapping = [
      { networkIp: '192.168.1.0', cidr: 24, name: 'Net A' },
      { networkIp: '192.168.1.128', cidr: 25, name: 'Net B' },
    ];
    const check1 = checkSubnetsOverlap(overlapping);
    expect(check1.hasOverlap).toBe(true);

    const nonOverlapping = [
      { networkIp: '192.168.1.0', cidr: 25, name: 'Net A' },
      { networkIp: '192.168.1.128', cidr: 25, name: 'Net B' },
    ];
    const check2 = checkSubnetsOverlap(nonOverlapping);
    expect(check2.hasOverlap).toBe(false);
  });

  it('computes a valid non-overlapping VLSM plan', () => {
    const reqs = [
      { name: 'LAN A (Faculty)', requiredHosts: 50 },
      { name: 'LAN B (Labs)', requiredHosts: 25 },
      { name: 'Server Farm', requiredHosts: 10 },
      { name: 'WAN Link R1-R2', requiredHosts: 2 },
    ];

    const plan = planVlsm('192.168.10.0', 24, reqs);
    expect(plan.hasOverlap).toBe(false);
    expect(plan.subnets.length).toBe(4);
    // Highest host requirement should be allocated first with /26 (62 usable hosts)
    expect(plan.subnets[0].name).toBe('LAN A (Faculty)');
    expect(plan.subnets[0].cidr).toBe(26);
    expect(plan.subnets[0].usableHosts).toBe(62);

    // WAN Link should be /30 (2 usable hosts)
    const wan = plan.subnets.find((s) => s.name === 'WAN Link R1-R2');
    expect(wan?.cidr).toBe(30);
    expect(wan?.usableHosts).toBe(2);
  });
});
