import {
  ComprehensiveDiagnosisReport,
  DiagnosisEngine,
  DiagnosticObservation,
} from '../diagnosis/diagnosisEngine.js';

export interface TopologyNodeStatus {
  id: string;
  label: string;
  ip?: string;
  status: 'SUCCESS' | 'FAIL' | 'WARNING' | 'NEUTRAL';
  evidenceSource: 'SIMULATED' | 'LIVE_TEST' | 'CAPTURE_ANALYSIS' | 'LAB_EVIDENCE';
  tooltip: string;
}

export interface EducationalScenario {
  id: string;
  title: string;
  badge: 'SIMULATED';
  summary: string;
  problemStatement: string;
  academicConcept: string;
  targetHost: string;
  targetPort?: number;
  expectedBehavior: string;
  ciscoConfigRef: string;
  pcapSampleRef: string;
  topologyNodes: TopologyNodeStatus[];
  observations: DiagnosticObservation[];
  precomputedDiagnosis: ComprehensiveDiagnosisReport;
}

export const EDUCATIONAL_SCENARIOS: EducationalScenario[] = [
  {
    id: 'scenario-1-normal',
    title: '1. Baseline Normal End-to-End Connectivity',
    badge: 'SIMULATED',
    summary: 'Full end-to-end communication from Client PC through Router R1, R2, DNS, and Target Web Server.',
    problemStatement: 'All physical links, Layer 2 switches, Layer 3 routers with RIPv2/Static routes, DNS, and TCP services are functioning correctly.',
    academicConcept: 'Verifies the complete OSI stack: L2 Ethernet framing, L3 IP addressing & routing, L4 TCP 3-way handshake, and L7 DNS/HTTP protocols.',
    targetHost: 'srv.lab.local',
    targetPort: 80,
    expectedBehavior: 'All diagnostics pass. DNS resolves, default gateway responds, traceroute completes across all router hops, and TCP port 80 handshake succeeds.',
    ciscoConfigRef: 'R1-baseline.cfg / R2-baseline.cfg',
    pcapSampleRef: 'scenario-1-normal.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Configured with IP 192.168.10.5/26 via DHCP' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'VLAN 10 access port active' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Responding to ICMP Echo within 1ms' },
      { id: 'routing', label: 'WAN Transit / R2', ip: '10.0.0.2', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'RIPv2 route to 192.168.20.0/27 active' },
      { id: 'dns', label: 'DNS Server', ip: '192.168.20.10', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Resolving srv.lab.local -> 192.168.20.50' },
      { id: 'service', label: 'Target Web Server', ip: '192.168.20.50', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'TCP Port 80 Open; HTTP 200 OK' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway 192.168.10.1 responded to 3/3 ICMP echo requests (avg RTT 1ms).',
      },
      {
        testName: 'DNS Resolution Test',
        stage: 'DNS',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Resolved "srv.lab.local" to 192.168.20.50 via DNS server 192.168.20.10.',
      },
      {
        testName: 'Path Traceroute',
        stage: 'ROUTING',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Path traversed R1 (192.168.10.1) -> R2 (10.0.0.2) -> Web Server (192.168.20.50).',
      },
      {
        testName: 'TCP Port 80 Connection',
        stage: 'TRANSPORT',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'TCP 3-way handshake established with 192.168.20.50:80 in 4ms.',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      'srv.lab.local',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'NIC active with IP 192.168.10.5/26.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Gateway 192.168.10.1 responded (0% loss).' },
        { testName: 'DNS Resolution Test', stage: 'DNS', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Resolved srv.lab.local -> 192.168.20.50.' },
        { testName: 'Path Traceroute', stage: 'ROUTING', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Path completed across all 3 hops.' },
        { testName: 'TCP Port 80 Connection', stage: 'TRANSPORT', status: 'PASS', evidenceSource: 'SIMULATED', details: 'TCP SYN-ACK received in 4ms.' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-2-auth-access',
    title: '2. Local LAN / Wi-Fi Access & DHCP Lease Failure',
    badge: 'SIMULATED',
    summary: 'Device is physically linked to Wi-Fi/Switch, but DHCP fails, assigning 169.254.x.x (APIPA).',
    problemStatement: 'The client shows "Connected" to the Wi-Fi SSID / Ethernet switch port, but no DHCP offer was received. Windows assigns a self-assigned link-local address without a gateway.',
    academicConcept: 'Illustrates the fundamental concept that "Connected to Wi-Fi" only indicates Layer 1/2 RF link association, NOT Layer 3 IP configuration.',
    targetHost: 'srv.lab.local',
    targetPort: 80,
    expectedBehavior: 'Interface shows 169.254.45.12. No default gateway exists. All outgoing packets fail immediately at the local host.',
    ciscoConfigRef: 'R1-failure-dhcp.cfg',
    pcapSampleRef: 'scenario-2-dhcp-failure.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '169.254.45.12', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'APIPA address assigned; no default gateway' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'WARNING', evidenceSource: 'SIMULATED', tooltip: 'Port up, but DHCP Discover packets dropped' },
      { id: 'gateway', label: 'Default Gateway R1', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'Unreachable; no route configured on client' },
      { id: 'routing', label: 'WAN Transit / R2', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
      { id: 'dns', label: 'DNS Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
      { id: 'service', label: 'Target Web Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'Self-assigned APIPA IPv4 address (169.254.45.12) detected. No default gateway route available.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'No default gateway configured to test.',
      },
      {
        testName: 'DNS Resolution Test',
        stage: 'DNS',
        status: 'NOT_TESTED',
        evidenceSource: 'SIMULATED',
        details: 'DNS lookup skipped because local IP interface is unconfigured.',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      'srv.lab.local',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'APIPA 169.254.x.x address detected with no default gateway.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'No default gateway configured.' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-3-gateway-down',
    title: '3. Default Gateway Router Failure',
    badge: 'SIMULATED',
    summary: 'Client has static IP or cached DHCP lease, but router interface is down or router has crashed.',
    problemStatement: 'The client PC has a valid IP (192.168.10.5/26) and gateway (192.168.10.1). However, the router interface GigabitEthernet0/0/0 is administratively shut down or disconnected.',
    academicConcept: 'Demonstrates Layer 2 ARP failure. Client broadcasts ARP requests ("Who has 192.168.10.1?"), but receives no ARP reply, causing immediate packet discard.',
    targetHost: 'srv.lab.local',
    targetPort: 80,
    expectedBehavior: 'Ping to default gateway times out with "Destination host unreachable". Client cannot forward frames beyond local collision/broadcast domain.',
    ciscoConfigRef: 'R1-failure-gateway.cfg',
    pcapSampleRef: 'scenario-3-gateway-down.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Valid IP 192.168.10.5 configured' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Layer 2 forwarding operational' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'Interface down; ARP requests unanswered' },
      { id: 'routing', label: 'WAN Transit / R2', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
      { id: 'dns', label: 'DNS Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
      { id: 'service', label: 'Target Web Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway 192.168.10.1 failed to respond (100% loss). ARP cache entry for gateway is INCOMPLETE.',
      },
      {
        testName: 'DNS Resolution Test',
        stage: 'DNS',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'DNS query timed out because gateway cannot forward outbound UDP 53 packets.',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      'srv.lab.local',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Valid IP configured.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'Gateway 192.168.10.1 unresponsive (100% loss, ARP incomplete).' },
        { testName: 'DNS Resolution Test', stage: 'DNS', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'DNS query timed out.' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-4-routing-failure',
    title: '4. Missing Routing Table Entry (Blackhole)',
    badge: 'SIMULATED',
    summary: 'Local gateway is reachable, but intermediate router R1 has no route to the remote server network.',
    problemStatement: 'Router R1 has a route to the client LAN and the P2P WAN link, but the static route or RIPv2 advertisement for 192.168.20.0/27 is missing or poisoned.',
    academicConcept: 'Shows how routing protocols maintain routing tables. When a destination IP does not match any entry or default route in the FIB, the router generates ICMP Type 3 Code 0 (Destination Network Unreachable).',
    targetHost: '192.168.20.50',
    targetPort: 80,
    expectedBehavior: 'Ping to default gateway 192.168.10.1 succeeds. Ping to remote server returns "Destination Net Unreachable" from 192.168.10.1.',
    ciscoConfigRef: 'R1-failure-routing.cfg',
    pcapSampleRef: 'scenario-4-routing-failure.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Local configuration correct' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'L2 forwarding normal' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Responding to pings, but missing route to 192.168.20.0/27' },
      { id: 'routing', label: 'WAN Transit / R2', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'Dropped at R1 with ICMP Type 3 Code 0' },
      { id: 'dns', label: 'DNS Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
      { id: 'service', label: 'Target Web Server', status: 'NEUTRAL', evidenceSource: 'SIMULATED', tooltip: 'Not reached' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway 192.168.10.1 responded in 1ms (0% loss).',
      },
      {
        testName: 'Destination Ping',
        stage: 'ROUTING',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'ICMP Destination Network Unreachable received from router 192.168.10.1. No route in routing table.',
      },
      {
        testName: 'Traceroute',
        stage: 'ROUTING',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'Traceroute halted at Hop 1 (192.168.10.1) with !N (Network unreachable).',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      '192.168.20.50',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Valid IP configured.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Gateway 192.168.10.1 responded (0% loss).' },
        { testName: 'Destination Ping', stage: 'ROUTING', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'Router 192.168.10.1 sent ICMP Type 3 Code 0 (Destination Network Unreachable).' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-5-dns-failure',
    title: '5. DNS Name Resolution Failure',
    badge: 'SIMULATED',
    summary: 'Network routing and IP reachability are 100% operational, but DNS server is offline or record is missing.',
    problemStatement: 'The user types "http://srv.lab.local" in the browser. Browser displays "Cannot reach website". However, pinging the IP 192.168.20.50 directly works flawlessly.',
    academicConcept: 'The classic "Connected Doesn\'t Mean Connected" conundrum: Applications depend on name resolution. A failure at Layer 7 DNS paralyzes URL access even when Layers 1-4 are completely intact.',
    targetHost: 'srv.lab.local',
    targetPort: 80,
    expectedBehavior: 'Direct IP ping to 192.168.20.50 passes with 0% loss. Hostname lookup for "srv.lab.local" returns NXDOMAIN or timeout.',
    ciscoConfigRef: 'R2-failure-dns.cfg',
    pcapSampleRef: 'scenario-5-dns-failure.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Local configuration correct' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'L2 forwarding normal' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Gateway operational' },
      { id: 'routing', label: 'WAN Transit / R2', ip: '10.0.0.2', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Transit routing active' },
      { id: 'dns', label: 'DNS Server', ip: '192.168.20.10', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'Returned NXDOMAIN or DNS daemon unreachable on port 53' },
      { id: 'service', label: 'Target Web Server', ip: '192.168.20.50', status: 'WARNING', evidenceSource: 'SIMULATED', tooltip: 'Reachable by direct IP, but inaccessible by hostname' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway responded in 1ms (0% loss).',
      },
      {
        testName: 'DNS Resolution Test',
        stage: 'DNS',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'DNS server returned NXDOMAIN (RCODE 3). Name "srv.lab.local" does not resolve.',
      },
      {
        testName: 'Direct IP Reachability Check',
        stage: 'ROUTING',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Direct ping to server IP 192.168.20.50 succeeded (0% loss, avg 3ms).',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      'srv.lab.local',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Valid IP configured.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Gateway responded.' },
        { testName: 'DNS Resolution Test', stage: 'DNS', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'DNS query returned NXDOMAIN (RCODE 3).' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-6-service-port-closed',
    title: '6. Target Service Daemon Down / Port Closed',
    badge: 'SIMULATED',
    summary: 'The target host is online and responds to ping, but the web server daemon on TCP port 80 is stopped.',
    problemStatement: 'The administrator stopped Apache/Nginx or an Access Control List (ACL) dropped port 80. Network ping succeeds, creating the illusion of health, but HTTP requests fail.',
    academicConcept: 'Proves why "Ping Works" does not equal "Service Works". ICMP is handled by the OS kernel, whereas TCP port 80 requires a listening user-space application socket.',
    targetHost: '192.168.20.50',
    targetPort: 80,
    expectedBehavior: 'ICMP echo reply returns in 2ms. TCP SYN packet to port 80 receives immediate TCP RST (ECONNREFUSED) from the target OS.',
    ciscoConfigRef: 'R2-failure-service.cfg',
    pcapSampleRef: 'scenario-6-service-closed.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Local configuration correct' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'L2 forwarding normal' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Gateway operational' },
      { id: 'routing', label: 'WAN Transit / R2', ip: '10.0.0.2', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Routing operational' },
      { id: 'dns', label: 'DNS Server', ip: '192.168.20.10', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'DNS resolution operational' },
      { id: 'service', label: 'Target Web Server', ip: '192.168.20.50', status: 'FAIL', evidenceSource: 'SIMULATED', tooltip: 'ICMP ping responds; TCP port 80 actively refused (RST)' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway responded in 1ms (0% loss).',
      },
      {
        testName: 'Target Host ICMP Ping',
        stage: 'ROUTING',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Target host 192.168.20.50 responded to ICMP echo requests (0% loss, avg 2ms).',
      },
      {
        testName: 'TCP Port 80 Connection',
        stage: 'TRANSPORT',
        status: 'FAIL',
        evidenceSource: 'SIMULATED',
        details: 'TCP connection refused (RST received) on port 80. The host OS is online, but no process is listening on port 80.',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      '192.168.20.50',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Valid IP configured.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Gateway responded.' },
        { testName: 'Target Host ICMP Ping', stage: 'ROUTING', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Target responded to ICMP (0% loss).' },
        { testName: 'TCP Port 80 Connection', stage: 'TRANSPORT', status: 'FAIL', evidenceSource: 'SIMULATED', details: 'TCP connection refused (RST received).' },
      ],
      'SIMULATED'
    ),
  },
  {
    id: 'scenario-7-congestion-packet-loss',
    title: '7. Network Congestion & High Packet Loss',
    badge: 'SIMULATED',
    summary: 'The path works intermittently, but severe link saturation causes 35% packet loss and high latency jitter.',
    problemStatement: 'The serial WAN link between R1 and R2 is saturated by a large file transfer, causing buffer overflows and queue drops in the router FIFO buffer.',
    academicConcept: 'Explores queueing delay, tail drop packet loss, TCP slow start, and the effect of duplicate ACKs and window shrinkage on perceived user responsiveness.',
    targetHost: '192.168.20.50',
    targetPort: 80,
    expectedBehavior: 'Ping succeeds intermittently with 33% packet loss. Round-trip times fluctuate between 8ms and 240ms. TCP connection requires repeated SYN retransmissions.',
    ciscoConfigRef: 'R1-baseline.cfg (congested WAN link simulation)',
    pcapSampleRef: 'scenario-7-congestion.pcap',
    topologyNodes: [
      { id: 'client', label: 'Client PC-01', ip: '192.168.10.5', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Local configuration correct' },
      { id: 'lan', label: 'LAN Switch SW-1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'L2 forwarding normal' },
      { id: 'gateway', label: 'Default Gateway R1', ip: '192.168.10.1', status: 'SUCCESS', evidenceSource: 'SIMULATED', tooltip: 'Gateway operational (0% loss)' },
      { id: 'routing', label: 'WAN Transit / R2', ip: '10.0.0.2', status: 'WARNING', evidenceSource: 'SIMULATED', tooltip: 'Queue drops; 35% loss, jitter 180ms' },
      { id: 'dns', label: 'DNS Server', ip: '192.168.20.10', status: 'WARNING', evidenceSource: 'SIMULATED', tooltip: 'Intermittent query timeouts' },
      { id: 'service', label: 'Target Web Server', ip: '192.168.20.50', status: 'WARNING', evidenceSource: 'SIMULATED', tooltip: 'TCP retransmissions required' },
    ],
    observations: [
      {
        testName: 'Local Interface Check',
        stage: 'INTERFACE',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'NIC active with valid IP 192.168.10.5/26 and default gateway 192.168.10.1.',
      },
      {
        testName: 'Gateway Reachability Ping',
        stage: 'GATEWAY',
        status: 'PASS',
        evidenceSource: 'SIMULATED',
        details: 'Default gateway responded in 1ms (0% loss). Local subnet is healthy.',
      },
      {
        testName: 'WAN Path Ping',
        stage: 'ROUTING',
        status: 'WARNING',
        evidenceSource: 'SIMULATED',
        details: '33% packet loss (2/6 packets dropped). Latency min/avg/max = 12ms / 148ms / 260ms.',
      },
      {
        testName: 'TCP Port 80 Latency',
        stage: 'TRANSPORT',
        status: 'WARNING',
        evidenceSource: 'SIMULATED',
        details: 'TCP connection succeeded after 1 retransmission (total connect time 280ms).',
      },
    ],
    precomputedDiagnosis: DiagnosisEngine.evaluate(
      '192.168.20.50',
      [
        { testName: 'Local Interface Check', stage: 'INTERFACE', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Valid IP configured.' },
        { testName: 'Gateway Reachability Ping', stage: 'GATEWAY', status: 'PASS', evidenceSource: 'SIMULATED', details: 'Gateway responded (0% loss).' },
        { testName: 'WAN Path Ping', stage: 'ROUTING', status: 'WARNING', evidenceSource: 'SIMULATED', details: '33% packet loss, high jitter.' },
        { testName: 'TCP Port 80 Latency', stage: 'TRANSPORT', status: 'WARNING', evidenceSource: 'SIMULATED', details: 'Connection degraded by packet drops.' },
      ],
      'SIMULATED'
    ),
  },
];

export class ScenarioService {
  public static getAllScenarios(): EducationalScenario[] {
    return EDUCATIONAL_SCENARIOS;
  }

  public static getScenarioById(id: string): EducationalScenario | undefined {
    return EDUCATIONAL_SCENARIOS.find((s) => s.id === id);
  }
}
