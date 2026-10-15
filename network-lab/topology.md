# Cisco Packet Tracer Network Topology Guide

## 1. Physical & Logical Topology Architecture

```mermaid
flowchart LR
    subgraph ClientLAN ["Student Client LAN (192.168.10.0/26)"]
        PC1["Client PC-01\n192.168.10.5/26"]
        PC2["Client PC-02\n192.168.10.6/26"]
        SW1["Switch SW-1\n(Cisco 2960)"]
        PC1 --- |Fa0/1| SW1
        PC2 --- |Fa0/2| SW1
    end

    subgraph RouterR1 ["Edge Router R1 (Cisco 2911)"]
        R1["Router R1\nGi0/0/0: 192.168.10.1\nSe0/1/0: 192.168.10.113"]
    end

    subgraph WANTransit ["Point-to-Point WAN (192.168.10.112/30)"]
        WANLink["Serial DCE/DTE Link\nClockrate: 64000\nRIPv2 / Static Routing"]
    end

    subgraph RouterR2 ["Core Router R2 (Cisco 2911)"]
        R2["Router R2\nSe0/1/0: 192.168.10.114\nGi0/0/0: 192.168.10.97"]
    end

    subgraph ServerLAN ["Server Farm LAN (192.168.10.96/28)"]
        SW2["Switch SW-2\n(Cisco 2960)"]
        DNS["DNS Server\n192.168.10.100\nUDP/TCP Port 53"]
        WEB["HTTP Web Server\n192.168.10.105\nTCP Port 80"]
        SW2 --- |Fa0/1| DNS
        SW2 --- |Fa0/2| WEB
    end

    SW1 --- |Fa0/24 - Gi0/0/0| R1
    R1 --- |Se0/1/0 (DCE)| WANLink
    WANLink --- |Se0/1/0 (DTE)| R2
    R2 --- |Gi0/0/0 - Fa0/24| SW2
```

---

## 2. Hardware Specification & Port Interconnections

| Source Device | Source Port | Destination Device | Destination Port | Cable Type | Subnet / Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PC-01** | `FastEthernet 0` | **Switch SW-1** | `FastEthernet 0/1` | Copper Straight-Through | LAN A Access Port |
| **PC-02** | `FastEthernet 0` | **Switch SW-1** | `FastEthernet 0/2` | Copper Straight-Through | LAN A Access Port |
| **Switch SW-1** | `FastEthernet 0/24` | **Router R1** | `GigabitEthernet 0/0/0` | Copper Straight-Through | LAN A Gateway Trunk/Access |
| **Router R1** | `Serial 0/1/0` (DCE) | **Router R2** | `Serial 0/1/0` (DTE) | Serial V.35 Cable | WAN Link (Clock: 64000) |
| **Router R2** | `GigabitEthernet 0/0/0` | **Switch SW-2** | `FastEthernet 0/24` | Copper Straight-Through | Server Farm Gateway Link |
| **Switch SW-2** | `FastEthernet 0/1` | **DNS Server** | `FastEthernet 0` | Copper Straight-Through | DNS Access Port |
| **Switch SW-2** | `FastEthernet 0/2` | **Web Server** | `FastEthernet 0` | Copper Straight-Through | Web Server Access Port |

---

## 3. Layer 3 Routing Architecture

### Dynamic Routing: RIPv2 (Routing Information Protocol Version 2)
Both routers are configured with RIP Version 2 with auto-summary disabled to support classless subnet masks (VLSM):

```cisco
! On Router R1
router rip
 version 2
 no auto-summary
 network 192.168.10.0
 passive-interface GigabitEthernet0/0/0
```

```cisco
! On Router R2
router rip
 version 2
 no auto-summary
 network 192.168.10.0
 passive-interface GigabitEthernet0/0/0
```

### Static Routing Alternative (Documented Backup)
If RIPv2 is not desired, standard static routes provide deterministic next-hop forwarding:
- **R1 Static Route to Server Farm:**
  `ip route 192.168.10.96 255.255.255.240 192.168.10.114`
- **R2 Static Route to Client LAN:**
  `ip route 192.168.10.0 255.255.255.192 192.168.10.113`

---

## 4. Academic Verification Commands in Packet Tracer

1. **Verify Interface Status:**
   ```cisco
   Router# show ip interface brief
   ```
   *Expected:* All active interfaces show `Status: up`, `Protocol: up`.

2. **Verify Routing Table:**
   ```cisco
   Router# show ip route
   ```
   *Expected:* R1 shows connected subnets (`C 192.168.10.0/26`, `C 192.168.10.112/30`) and RIP learned route (`R 192.168.10.96/28 [120/1] via 192.168.10.114`).

3. **Verify End-to-End ICMP Echo:**
   From PC-01 Command Prompt:
   ```cmd
   ping 192.168.10.1        (Default Gateway)
   ping 192.168.10.114      (Remote Router Interface)
   ping 192.168.10.100      (DNS Server)
   ping 192.168.10.105      (Web Server)
   ```

4. **Verify Traceroute Path:**
   ```cmd
   tracert 192.168.10.105
   ```
   *Expected:*
   Hop 1: `192.168.10.1` (R1 LAN Gateway)
   Hop 2: `192.168.10.114` (R2 WAN Interface)
   Hop 3: `192.168.10.105` (Target Web Server)
