export type FailurePoint =
  | 'PHYSICAL_OR_LOCAL_INTERFACE'
  | 'DEFAULT_GATEWAY'
  | 'ROUTING_AND_TRANSIT'
  | 'DNS_RESOLUTION'
  | 'TARGET_SERVICE_PORT'
  | 'NETWORK_CONGESTION_PACKET_LOSS'
  | 'NONE_HEALTHY'
  | 'INCONCLUSIVE';

export type DiagnosticStatus = 'PASS' | 'FAIL' | 'WARNING' | 'INCONCLUSIVE' | 'NOT_TESTED';
export type EvidenceSourceType = 'LIVE_TEST' | 'CAPTURE_ANALYSIS' | 'LAB_EVIDENCE' | 'SIMULATED';

export interface DiagnosticObservation {
  testName: string;
  stage: 'INTERFACE' | 'GATEWAY' | 'ROUTING' | 'DNS' | 'TRANSPORT' | 'PACKET_CAPTURE';
  status: DiagnosticStatus;
  evidenceSource: EvidenceSourceType;
  details: string;
  metric?: string | number;
  limitations?: string;
}

export interface ComprehensiveDiagnosisReport {
  id: string;
  target: string;
  timestamp: string;
  mode: EvidenceSourceType;
  overallStatus: 'CONNECTED_AND_HEALTHY' | 'CONNECTED_DEGRADED' | 'DISCONNECTED_OR_FAILED' | 'INCONCLUSIVE';
  mostLikelyFailurePoint: FailurePoint;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  primaryHeadline: string;
  technicalRootCause: string;
  observations: DiagnosticObservation[];
  testsPassed: string[];
  testsFailed: string[];
  testsInconclusive: string[];
  testsNotTested: string[];
  alternativeExplanations: string[];
  recommendedSteps: string[];
  limitationsStatement: string;
}

export class DiagnosisEngine {
  public static evaluate(
    target: string,
    observations: DiagnosticObservation[],
    mode: EvidenceSourceType = 'LIVE_TEST'
  ): ComprehensiveDiagnosisReport {
    const passed: string[] = [];
    const failed: string[] = [];
    const inconclusive: string[] = [];
    const notTested: string[] = [];

    const getObs = (stage: DiagnosticObservation['stage']) =>
      observations.find((o) => o.stage === stage);

    for (const obs of observations) {
      if (obs.status === 'PASS') passed.push(`${obs.testName}: ${obs.details}`);
      else if (obs.status === 'FAIL') failed.push(`${obs.testName}: ${obs.details}`);
      else if (obs.status === 'WARNING' || obs.status === 'INCONCLUSIVE')
        inconclusive.push(`${obs.testName}: ${obs.details}`);
      else if (obs.status === 'NOT_TESTED') notTested.push(obs.testName);
    }

    const ifaceObs = getObs('INTERFACE');
    const gwObs = getObs('GATEWAY');
    const routeObs = getObs('ROUTING');
    const dnsObs = getObs('DNS');
    const tcpObs = getObs('TRANSPORT');
    const pcapObs = getObs('PACKET_CAPTURE');

    let overallStatus: ComprehensiveDiagnosisReport['overallStatus'] = 'CONNECTED_AND_HEALTHY';
    let mostLikelyFailurePoint: FailurePoint = 'NONE_HEALTHY';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let primaryHeadline = '';
    let technicalRootCause = '';
    const alternativeExplanations: string[] = [];
    const recommendedSteps: string[] = [];

    // Rule 1: Physical / Local Interface Down
    if (ifaceObs && ifaceObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'PHYSICAL_OR_LOCAL_INTERFACE';
      confidence = 'HIGH';
      primaryHeadline = 'Local Network Interface Failure';
      technicalRootCause =
        'No active local network interface with a valid IPv4 configuration was detected. The host is physically disconnected from the LAN, Wi-Fi radio is off, or network driver is uninitialized.';
      alternativeExplanations.push(
        'An APIPA (Automatic Private IP Addressing, 169.254.x.x) address may have been assigned due to an unresponsive local DHCP server.'
      );
      recommendedSteps.push(
        'Check physical Ethernet cabling or Wi-Fi radio status.',
        'Verify local network adapter state in OS Device Manager / Control Panel.',
        'Run "ipconfig /renew" or restart the DHCP client service.'
      );
    }
    // Rule 2: Default Gateway Unreachable
    else if (gwObs && gwObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'DEFAULT_GATEWAY';
      confidence = 'HIGH';
      primaryHeadline = 'Default Gateway Unreachable';
      technicalRootCause =
        'The host has an active IP interface, but its default gateway router did not respond to ICMP or ARP. Without an accessible default gateway, all packets destined for external subnets cannot exit the local broadcast domain.';
      alternativeExplanations.push(
        'The local router/switch port may be disabled, the router may have crashed, or a VLAN mismatch may isolate this host from the gateway interface.',
        'In rare corporate setups, default gateways may be configured to suppress ICMP echo replies, though ARP would still resolve if functional.'
      );
      recommendedSteps.push(
        'Verify IP address, subnet mask, and default gateway configuration on the client.',
        'Ping the default gateway IP directly from terminal to verify Layer 2/3 adjacency.',
        'Check if the router hardware is powered on and the LAN link LED is illuminated.'
      );
    }
    // Rule 3: DNS Resolution Failure
    else if (dnsObs && dnsObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'DNS_RESOLUTION';
      confidence = 'HIGH';
      primaryHeadline = 'Domain Name Resolution (DNS) Failure';
      technicalRootCause = `The local interface and gateway appear functional, but domain name lookup for "${target}" failed. Network requests addressed by hostname cannot determine the destination IP address.`;
      alternativeExplanations.push(
        'The configured DNS server (e.g. ISP or local resolver) may be offline or unreachable on UDP port 53.',
        `The hostname "${target}" may be misspelled or unregistered in authoritative DNS registries (NXDOMAIN).`,
        'An egress firewall rule or captive portal may be intercepting or dropping outbound UDP/TCP port 53 traffic.'
      );
      recommendedSteps.push(
        'Test resolving with an independent public DNS resolver (e.g. 8.8.8.8, 1.1.1.1, 9.9.9.9).',
        `Run "nslookup ${target} 8.8.8.8" to isolate whether the domain exists or if only the local resolver is broken.`,
        'Check local DNS cache and run "ipconfig /flushdns".'
      );
    }
    // Rule 4: Intermediate Routing / Transit Blackhole
    else if (routeObs && routeObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'ROUTING_AND_TRANSIT';
      confidence = 'MEDIUM';
      primaryHeadline = 'Upstream Routing / Transit Path Failure';
      technicalRootCause =
        'Packets successfully leave the local gateway, but an upstream intermediate router failed to forward packets to the destination network. A routing blackhole, missing static route, or upstream BGP/OSPF route flap is likely.';
      alternativeExplanations.push(
        'Intermediate transit routers may intentionally suppress ICMP Time Exceeded packets, creating gaps in traceroutes without actually dropping user TCP traffic.',
        'The target network may be advertising asymmetrical routes with return traffic being dropped on the reverse path.'
      );
      recommendedSteps.push(
        'Inspect traceroute hops to identify the last responding intermediate router IP.',
        'Verify router routing tables (e.g., in Packet Tracer: "show ip route").',
        'Check dynamic routing protocol neighbor adjacencies (RIPv2, OSPF, BGP).'
      );
    }
    // Rule 5: Specific Target Service / Port Down
    else if (tcpObs && tcpObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'TARGET_SERVICE_PORT';
      confidence = 'HIGH';
      primaryHeadline = 'Target Service Port Unreachable or Closed';
      technicalRootCause =
        'Network Layer 3 routing succeeded, but the specific transport port on the target host failed to complete a TCP handshake. The remote daemon is stopped, listening on a different port, or blocked by a target host firewall.';
      alternativeExplanations.push(
        'An intermediate stateful firewall or cloud security group (e.g. AWS Security Group / iptables) may be dropping inbound connections on this port.',
        'If an active TCP RST was returned (ECONNREFUSED), the operating system on the destination is alive and rejecting the socket connection.'
      );
      recommendedSteps.push(
        'Verify whether the server process (e.g., Apache, Nginx, Node.js) is running on the target machine.',
        'Check server-side firewall rules (iptables, UFW, Windows Defender Firewall).',
        'Verify listening sockets on target host using "netstat -an" or "ss -tulpn".'
      );
    }
    // Rule 6: Congestion / Packet Loss
    else if (
      (gwObs && gwObs.status === 'WARNING') ||
      (routeObs && routeObs.status === 'WARNING') ||
      (tcpObs && tcpObs.status === 'WARNING')
    ) {
      overallStatus = 'CONNECTED_DEGRADED';
      mostLikelyFailurePoint = 'NETWORK_CONGESTION_PACKET_LOSS';
      confidence = 'MEDIUM';
      primaryHeadline = 'Degraded Network Performance (Packet Loss / High Latency)';
      technicalRootCause =
        'Connectivity was established, but significant packet loss, high latency jitter, or TCP retransmissions were observed along the transmission path.';
      alternativeExplanations.push(
        'Wi-Fi radio interference, bufferbloat on home gateway, or transit link saturation during peak traffic hours.',
        'Rate limiting or traffic shaping applied by the ISP.'
      );
      recommendedSteps.push(
        'Check ping round-trip times and variance across multiple samples.',
        'Switch from 2.4 GHz to 5 GHz Wi-Fi band or connect via wired Gigabit Ethernet.',
        'Inspect packet capture for TCP duplicate ACKs and Fast Retransmissions.'
      );
    }
    // Rule 7: Packet capture corroboration (if uploaded or analyzed)
    else if (pcapObs && pcapObs.status === 'FAIL') {
      overallStatus = 'DISCONNECTED_OR_FAILED';
      mostLikelyFailurePoint = 'ROUTING_AND_TRANSIT';
      confidence = 'MEDIUM';
      primaryHeadline = 'Failure Evidence Identified in Packet Capture';
      technicalRootCause = pcapObs.details;
      recommendedSteps.push(
        'Inspect individual frame fields in the Packet Analyzer table for ICMP or TCP reset signatures.'
      );
    }
    // Rule 8: All Clear
    else if (passed.length > 0 && failed.length === 0) {
      overallStatus = 'CONNECTED_AND_HEALTHY';
      mostLikelyFailurePoint = 'NONE_HEALTHY';
      confidence = 'HIGH';
      primaryHeadline = 'All Connectivity Layers Operational';
      technicalRootCause =
        'All tested stages—local interface, default gateway reachability, DNS name resolution, and transport layer socket establishment—responded successfully within expected latency thresholds.';
      recommendedSteps.push(
        'No corrective network actions required. Host has verified end-to-end connectivity.'
      );
    } else {
      overallStatus = 'INCONCLUSIVE';
      mostLikelyFailurePoint = 'INCONCLUSIVE';
      confidence = 'LOW';
      primaryHeadline = 'Inconclusive Diagnostic Evidence';
      technicalRootCause =
        'Insufficient or conflicting diagnostic data was collected to pinpoint a single failing stage with high confidence.';
      alternativeExplanations.push(
        'Transient network conditions or firewall filtering may have prevented clear differentiation between host downtime and protocol suppression.'
      );
      recommendedSteps.push(
        'Run a comprehensive diagnostic test or capture a live PCAP trace to gather conclusive packet-level evidence.'
      );
    }

    const reportId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: reportId,
      target,
      timestamp: new Date().toISOString(),
      mode,
      overallStatus,
      mostLikelyFailurePoint,
      confidence,
      primaryHeadline,
      technicalRootCause,
      observations,
      testsPassed: passed,
      testsFailed: failed,
      testsInconclusive: inconclusive,
      testsNotTested: notTested,
      alternativeExplanations,
      recommendedSteps,
      limitationsStatement:
        'Evidence-based diagnosis is constrained by observable responses and ICMP/TCP protocol semantics. Intermediate stateful firewalls, packet filters, and cloud policies can mimic or mask network outages.',
    };
  }
}
