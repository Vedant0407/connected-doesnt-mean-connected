# User & Evaluator Guide

## 1. Dashboard Overview
The **Dashboard** serves as the central command center for network operations:
- **System & External Tool Health:** Real-time badge indicating whether TShark is detected or if the Native PCAP Parser is operating as the fallback.
- **Diagnostics KPI Cards:** Total successful checks, confirmed failures, warnings, and inconclusive results.
- **Quick Action Triggers:** One-click shortcuts to initiate a live diagnostic check, upload a PCAP trace, or simulate an educational failure scenario.
- **Recent Diagnostic History:** Table of previous runs with direct links to view or compare results.

---

## 2. Interactive Network Topology
The **Interactive Topology** visualizes the end-to-end communication path:
$$\text{Client PC} \longrightarrow \text{LAN Switch} \longrightarrow \text{Default Gateway (R1)} \longrightarrow \text{WAN Transit (R2)} \longrightarrow \text{DNS Server} \longrightarrow \text{Target Web Service}$$

- **Dynamic Node Status Coloring:**
  - 🟢 **Green:** Stage verified operational with positive evidence.
  - 🔴 **Red:** Confirmed point of failure.
  - 🟡 **Amber:** Degraded performance or warning (e.g. packet loss or timeout).
  - ⚪ **Slate / Neutral:** Stage not tested or bypassed.
- **Node Details Drawer:** Click on any node in the topology diagram to inspect its IP address, MAC address, subnet mask, ping latency, and raw test logs.
- **Animated Packet Flow:** During an active test or scenario playback, animated pulses travel along the verified link paths. If a failure occurs, packet animation halts at the failing node.

---

## 3. Diagnostic Workspace
Execute real, non-destructive network tests from the host machine against any valid target:
1. **Target Input:** Enter a domain name (`google.com`, `cloudflare.com`) or an IPv4 address (`8.8.8.8`, `192.168.1.1`).
2. **Test Profile Selection:**
   - **Comprehensive:** Runs interface audit, gateway ping, DNS resolution, destination ping, traceroute, and TCP port handshake.
   - **Quick:** Skips traceroute for fast 2-second triage.
   - **DNS Only:** Focuses exclusively on name resolution, comparing multiple record types (A, AAAA, CNAME).
   - **TCP Port Only:** Tests Layer 4 socket establishment on a custom port.
   - **Gateway Only:** Validates local subnet Layer 2/3 adjacency.
3. **Execution & Live Progress:** Watch each stage execute in sequence with millisecond timers and honest status badges.

---

## 4. Packet Analyzer & Deep-Packet Inspector
Analyze standard `.pcap` and `.pcapng` packet capture files:
1. **Upload or Sample Selection:** Drag and drop any capture file (up to 25 MB) or pick one of the 7 pre-packaged educational scenario captures.
2. **Protocol Distribution Chart:** Visual bar and pie charts illustrating traffic composition (DNS, TCP, UDP, ICMP, HTTP, TLS, ARP).
3. **Wireshark-Style Packet Table:**
   - Columns: Frame #, Timestamp, Protocol, Source IP, Destination IP, Source Port, Destination Port, Length, Summary.
   - Real-time protocol filter buttons: `All`, `DNS`, `TCP`, `UDP`, `ICMP`, `HTTP`, `TLS`.
4. **Packet Detail Modal:** Click on any frame row to view parsed Layer 2 (Ethernet), Layer 3 (IPv4/IPv6), and Layer 4/7 (TCP flags, ICMP types/codes, DNS transaction details).

---

## 5. Educational Scenario Lab
Compare theoretical expectations with empirical network evidence across seven pre-configured scenarios:
- **Scenario 1:** Baseline Normal Connectivity (All Pass)
- **Scenario 2:** LAN / Wi-Fi Access & DHCP Failure (APIPA 169.254.x.x)
- **Scenario 3:** Default Gateway Router Offline (ARP Incomplete)
- **Scenario 4:** Routing Blackhole / Missing Route (ICMP Net Unreachable)
- **Scenario 5:** DNS Name Resolution Failure (NXDOMAIN / Port 53 Blocked)
- **Scenario 6:** Target Service Daemon Down / Port Closed (TCP RST)
- **Scenario 7:** Network Congestion & High Packet Loss (Retransmissions)

Every scenario is clearly flagged with a **`[SIMULATED]`** badge to distinguish it from live host diagnostics.

---

## 6. Cisco Packet Tracer Lab Hub & VLSM Planner
- **Interactive VLSM Calculator:** Input a base IPv4 address (e.g. `192.168.10.0/24`) and customize host requirements for each department. Instantly computes prefixes, masks, usable IP ranges, and programmatically verifies zero subnet overlaps.
- **Router Configuration Viewer:** Inspect and copy ready-to-paste Cisco IOS configurations for Routers R1 and R2.
- **Lab Evidence Importer:** Input manual test results gathered from Cisco Packet Tracer CLI. Generates a diagnostic report tagged with **`[LAB_EVIDENCE]`** for academic submissions.

---

## 7. Reports & Diagnostic History
- **Run Comparison Engine:** Select any two historical runs (e.g., Run 1 vs Run 2) to generate a diff view highlighting changes in latency, status, or failure attribution.
- **Data Export:** Export any diagnostic report as standard **JSON** or **CSV** for inclusion in lab reports and project documentation.
