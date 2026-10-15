# Packet Tracer Lab Execution & Failure Injection Guide

## 1. Academic Lab Objectives
This lab curriculum demonstrates the core thesis of **"Connected Doesn't Mean Connected"**:
- Layer 1/2 physical link association does not guarantee Layer 3 IP configuration (Scenario 2).
- Having a valid local IP configuration does not guarantee that the default gateway is operational (Scenario 3).
- Having a responsive default gateway does not guarantee that intermediate routers know the path to the destination network (Scenario 4).
- Having operational IP routing does not guarantee that domain name resolution succeeds (Scenario 5).
- Having successful ICMP ping reachability does not guarantee that the application daemon is accepting TCP socket connections (Scenario 6).
- End-to-end transport can be degraded by bufferbloat and queue drops without total link failure (Scenario 7).

---

## 2. Cisco Packet Tracer Setup Instructions

1. Open **Cisco Packet Tracer** (version 7.3, 8.0, 8.1, or 8.2+).
2. Place two **Cisco 2911 Routers** named `Router-R1` and `Router-R2`.
   - Power off each router in the Physical tab.
   - Insert the **HWIC-2T** (Dual-Port Serial High-Speed WAN Interface Card) into slot 0.
   - Power the routers back on.
3. Place two **Cisco 2960 Switches** named `Switch-SW1` and `Switch-SW2`.
4. Place two End Devices: `PC-01` and `PC-02` connected to `SW-1`.
5. Place two Server Devices: `DNS-Server` and `Web-Server` connected to `SW-2`.
6. Cable the topology according to `network-lab/topology.md`.
7. Paste `R1-baseline.cfg` into Router R1's CLI, and `R2-baseline.cfg` into Router R2's CLI.
8. Save the working baseline topology as `baseline-topology.pkt` in `network-lab/`.

---

## 3. Failure Injection Procedures

### Scenario 2: DHCP Access Failure (APIPA)
- **Action:** Open Router R1 CLI and issue:
  ```cisco
  Router-R1# configure terminal
  Router-R1(config)# no service dhcp
  Router-R1(config)# end
  ```
- On PC-01, open Desktop -> IP Configuration -> Click Static, then click DHCP again.
- **Observed Behavior:** DHCP Request failed. APIPA `169.254.x.x` assigned. Default Gateway is `0.0.0.0`.

### Scenario 3: Default Gateway Failure
- **Action:** Open Router R1 CLI and issue:
  ```cisco
  Router-R1# configure terminal
  Router-R1(config)# interface GigabitEthernet0/0/0
  Router-R1(config-if)# shutdown
  Router-R1(config-if)# end
  ```
- On PC-01 Command Prompt, ping the gateway:
  ```cmd
  ping 192.168.10.1
  ```
- **Observed Behavior:** "Destination host unreachable" or "Request timed out". ARP table (`arp -a`) shows gateway entry incomplete.

### Scenario 4: Routing Blackhole
- **Action:** Restore Gi0/0/0 (`no shutdown`), then remove the routing protocol from R1:
  ```cisco
  Router-R1# configure terminal
  Router-R1(config)# no router rip
  Router-R1(config)# end
  ```
- On PC-01 Command Prompt:
  ```cmd
  ping 192.168.10.105
  ```
- **Observed Behavior:** Ping to default gateway `192.168.10.1` succeeds (100%), but ping to `192.168.10.105` replies:
  `Reply from 192.168.10.1: Destination net unreachable.`

### Scenario 5: DNS Port Filtered
- **Action:** Apply `R2-failure-dns.cfg` on Router R2.
- On PC-01 Command Prompt:
  ```cmd
  ping 192.168.10.105
  ```
  *(Ping succeeds!)*
- Now open Web Browser on PC-01 and type `http://srv.lab.local`.
- **Observed Behavior:** Browser displays `Host Name Unresolved`. DNS query on port 53 was dropped by R2 access list.

### Scenario 6: Service Port 80 Blocked
- **Action:** Apply `R2-failure-service.cfg` on Router R2.
- On PC-01 Command Prompt:
  ```cmd
  ping 192.168.10.105
  ```
  *(Ping succeeds with 0% loss!)*
- Now attempt to browse `http://192.168.10.105` in PC-01 Web Browser or connect on port 80.
- **Observed Behavior:** Browser displays `Request Timeout`. Transport layer socket is rejected.

---

## 4. Honest Integration: Importing Lab Evidence into the Application

In adherence to Academic Integrity, the application does not pretend to silently intercept raw Packet Tracer `.pkt` binaries. Instead:

1. Perform the test in Packet Tracer CLI / Simulation Mode.
2. In the web application, navigate to the **Cisco Packet Tracer Lab Hub**.
3. Select **"Import Lab Evidence"**.
4. Input your Packet Tracer test results (e.g. Gateway Ping: PASS, Destination Ping: FAIL with ICMP Net Unreachable).
5. The application will tag the diagnosis with **`LAB_EVIDENCE`** and correlate the findings with the theoretical VLSM model and packet signatures!
