# Computer Networks Viva & Defense Questions

A comprehensive academic compilation of 25+ viva voce examination questions and model answers designed for undergraduate and graduate Computer Networks project evaluations.

---

### Q1: What is the fundamental concept behind the project title "Connected Doesn't Mean Connected"?
**Answer:**
Operating systems display a "Connected" status when the local network interface has successfully established Layer 1 (physical link) and Layer 2 (data link framing) association with a local switch or wireless access point (e.g. Wi-Fi SSID). However, end-to-end communication requires a fully operational protocol stack:
1. **Layer 3:** Valid IP configuration, subnet mask, default gateway, and end-to-end routing.
2. **Layer 4:** Responsive transport layer sockets (TCP handshake or UDP ports).
3. **Layer 7:** Operational application protocols, specifically DNS name resolution and HTTP/HTTPS daemons.
A failure at any one of these upper layers renders the network inaccessible to user applications despite the physical connection remaining "Connected".

---

### Q2: What is APIPA (Automatic Private IP Addressing), and why does it occur?
**Answer:**
APIPA (defined in RFC 3927) is a link-local address assignment mechanism used by operating systems when configured for DHCP but unable to reach a DHCP server. It assigns an address from the `169.254.0.0/16` block with subnet mask `255.255.0.0`. It occurs when the DHCP `DISCOVER` broadcasts receive no `OFFER` replies. Because APIPA does not configure a default gateway, hosts can only communicate with adjacent peers on the same local broadcast domain and cannot route traffic to external subnets or the Internet.

---

### Q3: Explain the DHCP DORA process.
**Answer:**
The DHCP allocation cycle follows four stages:
1. **Discover:** The client broadcasts a UDP packet (Source: `0.0.0.0:68`, Dest: `255.255.255.255:67`) to locate available DHCP servers.
2. **Offer:** One or more DHCP servers unicast or broadcast a proposed IP, subnet mask, default gateway, and DNS servers.
3. **Request:** The client broadcasts a formal request accepting one specific offer.
4. **Acknowledge (ACK):** The chosen server confirms the lease and registers the client's MAC address in its binding table.

---

### Q4: Why does a successful ICMP Ping not guarantee that a website or web service is working?
**Answer:**
ICMP (Internet Control Message Protocol) operates at Layer 3 (Network Layer) and is processed directly within the operating system kernel. A target server can readily return an ICMP Echo Reply (Type 0) even if:
- The web server daemon (e.g. Apache, Nginx, Node.js) has crashed or is not running.
- The web application is listening on a different port.
- An application error (e.g. HTTP 500 Internal Server Error or Database connection failure) is preventing content delivery.
Conversely, many cloud providers (like AWS) drop ICMP by default for security, so a failed ping does not prove the website is down.

---

### Q5: What is the difference between receiving a TCP RST and a TCP Connection Timeout?
**Answer:**
- **TCP RST (ECONNREFUSED):** The client transmits a `SYN`, and the destination host responds with an immediate `RST/ACK`. This proves that Layer 3 IP routing to the destination is 100% operational, but the target operating system has no application listening on that specific TCP port, or a local host firewall actively rejected the socket.
- **TCP Connection Timeout (ETIMEDOUT):** The client transmits repeated `SYN` packets, but receives no response whatsoever. This typically indicates that an intermediate firewall, security group, or routing blackhole is silently dropping packets without returning an error.

---

### Q6: Explain the TCP Three-Way Handshake.
**Answer:**
To establish a reliable, full-duplex byte stream:
1. **Client $\rightarrow$ Server (SYN):** The client sends a segment with the `SYN` flag set and an Initial Sequence Number ($ISN_c$).
2. **Server $\rightarrow$ Client (SYN-ACK):** The server responds with `SYN` and `ACK` flags set, acknowledging $ISN_c + 1$ and choosing its own $ISN_s$.
3. **Client $\rightarrow$ Server (ACK):** The client sends an segment with the `ACK` flag set, acknowledging $ISN_s + 1$.
Once completed, the socket enters the `ESTABLISHED` state.

---

### Q7: What are the primary ICMP Type 3 codes, and what do they indicate?
**Answer:**
ICMP Type 3 signifies **Destination Unreachable**:
- **Code 0 (Net Unreachable):** The router has no route in its routing table to the destination network.
- **Code 1 (Host Unreachable):** The local router reached the destination subnet, but the host failed to answer ARP requests.
- **Code 2 (Protocol Unreachable):** The destination host OS does not support the requested Layer 4 transport protocol.
- **Code 3 (Port Unreachable):** Generated when a UDP packet arrives at a port with no active listener (UDP counterpart of TCP RST).
- **Code 13 (Communication Administratively Filtered):** An intermediate firewall or access list explicitly dropped the packet.

---

### Q8: How does Traceroute discover intermediate router hops?
**Answer:**
Traceroute exploits the IPv4 **Time-To-Live (TTL)** field:
1. It sends a probe packet with $\text{TTL} = 1$. The first router decrements TTL to 0, discards the packet, and returns an **ICMP Type 11 (Time Exceeded)** message with its own IP address as the source.
2. It sends the next probe with $\text{TTL} = 2$, identifying the second router hop.
3. This process increments TTL by 1 sequentially until an ICMP Echo Reply (or port unreachable) is received from the final destination.

---

### Q9: Why do asterisks (`* * *`) sometimes appear in traceroute outputs?
**Answer:**
An asterisk indicates that no response was received for that probe within the timeout window. This does **not** necessarily indicate a broken network:
- Many enterprise and transit routers rate-limit or completely disable ICMP Time Exceeded generation to protect their CPU control plane from denial-of-service attacks.
- If subsequent hops respond normally, traffic is being forwarded without packet loss.

---

### Q10: What is the role of the Default Gateway in a client computer?
**Answer:**
A client computer compares the destination IP address with its own IP and subnet mask using bitwise AND operations:
- If the destination IP is on the **same subnet**, the client resolves the destination MAC address directly via ARP and transmits the Ethernet frame.
- If the destination IP is on a **different subnet**, the client cannot deliver the frame directly. It encapsulates the packet in a frame addressed to the Layer 2 MAC address of the **Default Gateway** router, which forwards it to the next-hop network.

---

### Q11: What is ARP, and how does it operate?
**Answer:**
The Address Resolution Protocol (RFC 826) maps a known Layer 3 IPv4 address to a Layer 2 physical MAC address.
1. The host broadcasts an **ARP Request** (`ff:ff:ff:ff:ff:ff`): *"Who has IP 192.168.10.1? Tell 192.168.10.5"*.
2. The owner of that IP replies with a unicast **ARP Reply** containing its MAC address.
3. The sender caches the MAC in its ARP table to avoid repeated broadcasts.

---

### Q12: What is the difference between FLSM and VLSM?
**Answer:**
- **FLSM (Fixed Length Subnet Masking):** All subnets within the major network use identical subnet masks and have identical host capacities, leading to massive address waste on point-to-point links (e.g. using a /24 for two router interfaces).
- **VLSM (Variable Length Subnet Masking):** Subnetting a subnet. Each subnet uses a mask tailored to its required host capacity (e.g. `/26` for 50 hosts, `/30` for 2 router interfaces), maximizing IPv4 conservation.

---

### Q13: In VLSM planning, why must subnets be allocated in descending order of requirement size?
**Answer:**
Subnet blocks must align on binary power-of-two boundaries ($0, 64, 128, 192\dots$). Allocating largest subnets first ensures that large power-of-two blocks fit cleanly into the address space without creating address fragmentation that would prevent fitting subsequent smaller blocks.

---

### Q14: What is the difference between Authoritative and Recursive DNS servers?
**Answer:**
- **Recursive DNS Resolver:** (e.g. Google 8.8.8.8, Cloudflare 1.1.1.1, ISP resolver). Queries other name servers on behalf of the client, starting from Root servers, TLD servers, down to Authoritative servers, and caches the result.
- **Authoritative DNS Server:** Holds the actual DNS database records for a specific domain zone (e.g. `example.com`) and has the definitive authority to answer queries for that domain.

---

### Q15: What do DNS RCODEs 0, 2, and 3 mean?
**Answer:**
- **RCODE 0 (NOERROR):** The query completed successfully and returned valid records.
- **RCODE 2 (SERVFAIL):** The name server encountered an internal failure or could not reach upstream authoritative servers.
- **RCODE 3 (NXDOMAIN):** Non-Existent Domain. The requested domain name does not exist in the authoritative database.

---

### Q16: How does RIPv2 prevent routing loops?
**Answer:**
RIPv2 (Distance Vector protocol) employs:
1. **Split Horizon:** A router never advertises a route back out the same interface through which it learned it.
2. **Poison Reverse:** Explicitly advertising an unreachable route with metric 16 ($\infty$).
3. **Hold-Down Timers:** Preventing a route from being updated immediately after receiving an update indicating it is unreachable.
4. **Hop Count Limit:** Maximum metric of 15 hops; 16 signifies unreachable.

---

### Q17: Why is "no auto-summary" required when configuring RIPv2 with VLSM?
**Answer:**
By default, RIP automatically summarizes subnetted networks at classful boundaries (Class A: `/8`, Class B: `/16`, Class C: `/24`) when sending updates across different major network boundaries. Disabling auto-summary (`no auto-summary`) forces RIPv2 to include the subnet mask in routing updates, enabling true VLSM classless routing.

---

### Q18: What is a Routing Blackhole?
**Answer:**
A routing blackhole occurs when a router silently discards packets destined for an IP address because it lacks a matching route in its routing table and has no default route (`0.0.0.0/0`), or because a route points to a `Null0` discard interface.

---

### Q19: What is the difference between PCAP and PCAPNG file formats?
**Answer:**
- **Classic PCAP:** Begins with magic number `0xa1b2c3d4`. Uses a fixed 24-byte global header followed by 16-byte packet record headers. It supports only a single interface and microsecond/nanosecond timestamps.
- **PCAPNG (Next Generation):** Block-based architecture starting with Section Header Block `0x0A0D0D0A`. Supports multiple capture interfaces in a single file, interface statistics, packet drop counts, and extensible metadata comments.

---

### Q20: What is Promiscuous Mode in packet capture?
**Answer:**
In normal operation, a Network Interface Card (NIC) filters frames in hardware, passing only broadcast frames, multicast frames, and frames addressed to its own MAC address to the OS kernel. In **Promiscuous Mode**, the NIC disables this hardware filter and passes all frames detected on the physical wire/radio to the capture driver (Npcap/libpcap).

---

### Q21: What is Bufferbloat, and how does it degrade network performance?
**Answer:**
Bufferbloat is the excessive queueing of packets in network router buffers. When links become congested, overly large buffers delay packet transmission rather than dropping them early. This introduces extreme latency jitter (hundreds of milliseconds) and delays TCP ACK feedback, causing TCP window oscillation and degrading real-time traffic (VoIP, gaming).

---

### Q22: Explain the function of TCP Duplicate ACKs and Fast Retransmit.
**Answer:**
When an intermediate packet is lost in a TCP stream, out-of-order packets arriving at the receiver generate immediate Duplicate ACKs containing the sequence number of the missing byte. When the sender receives **three consecutive duplicate ACKs**, it infers packet loss and immediately retransmits the missing segment (Fast Retransmit) without waiting for the slow Retransmission Timeout (RTO) timer to expire.

---

### Q23: Why cannot Node.js execute a Cisco Packet Tracer `.pkt` file directly?
**Answer:**
A Cisco Packet Tracer `.pkt` file is a proprietary, encrypted binary file format designed exclusively for execution inside the Cisco Packet Tracer simulation engine. It is not an open packet capture format like PCAP, nor an executable binary. The academically rigorous approach implemented in this project is to run topologies in Packet Tracer, export or verify test results, and import documented findings into the diagnostic engine as `LAB_EVIDENCE`.

---

### Q24: What is the significance of the Subnet Mask in binary?
**Answer:**
The subnet mask consists of continuous 1s followed by continuous 0s. The contiguous 1s define the **Network Portion** of the IP address, while the remaining 0s define the **Host Portion**. Applying a bitwise AND between an IP address and its subnet mask extracts the exact Network ID.

---

### Q25: Why is the first address in a subnet reserved as the Network Address and the last as the Broadcast Address?
**Answer:**
- **Network Address (All host bits = 0):** Uniquely identifies the entire subnet in IP routing tables without referencing any individual host.
- **Broadcast Address (All host bits = 1):** Targets all hosts currently attached to that subnet simultaneously (e.g. for ARP requests or DHCP discovers).
Consequently, for any subnet with $h$ host bits, the usable host count is $2^h - 2$.
