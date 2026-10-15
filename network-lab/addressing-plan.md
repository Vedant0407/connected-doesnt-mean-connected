# Variable Length Subnet Masking (VLSM) Addressing Plan

## 1. Network Overview & Design Parameters
- **Base Major Network:** `192.168.10.0/24` (Private IPv4 Class C Block, RFC 1918)
- **Total Address Space:** 256 IPv4 Addresses (`192.168.10.0` through `192.168.10.255`)
- **Default Subnet Mask (Base):** `255.255.255.0`
- **Design Philosophy:** Variable Length Subnet Masking (VLSM) is applied to eliminate IPv4 address waste by allocating subnet prefixes that match the host capacity requirement of each individual network segment.

---

## 2. Requirement Analysis & Subnet Allocation (Sorted Descending)

Standard VLSM calculation rule:
$$\text{Total IPs Needed} = \text{Host Capacity} + 2 \text{ (1 Network ID + 1 Broadcast Address)}$$
$$\text{Host Bits } (h) \text{ such that } 2^h \ge \text{Total IPs Needed}$$
$$\text{Prefix Length } (/n) = 32 - h$$

| Subnet Name | Host Requirement | Total IPs Required | Power of 2 ($2^h$) | Host Bits ($h$) | Prefix Length | Subnet Mask | Usable Hosts |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LAN A (Student / Client PCs)** | 50 Hosts | 52 | 64 ($2^6$) | 6 | `/26` | `255.255.255.192` | 62 |
| **LAN B (Academic Faculty)** | 25 Hosts | 27 | 32 ($2^5$) | 5 | `/27` | `255.255.255.224` | 30 |
| **Server Farm (DNS & Web Servers)** | 10 Hosts | 12 | 16 ($2^4$) | 4 | `/28` | `255.255.255.240` | 14 |
| **WAN Point-to-Point Link (R1-R2)** | 2 Hosts (Routers) | 4 | 4 ($2^2$) | 2 | `/30` | `255.255.255.252` | 2 |
| **Management / Expansion** | Reserved | - | - | - | `/28` | `255.255.255.240` | 14 |

---

## 3. Comprehensive Subnet Allocation Table

| Subnet Identifier | Network Address | CIDR Prefix | Subnet Mask | First Usable Host | Last Usable Host | Broadcast Address | Assigned Devices & Gateways |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Subnet 1: LAN A (Clients)** | `192.168.10.0` | `/26` | `255.255.255.192` | `192.168.10.1` | `192.168.10.62` | `192.168.10.63` | Gateway: R1 `Gi0/0/0` (`192.168.10.1`)<br>Clients: `192.168.10.5` - `192.168.10.62` |
| **Subnet 2: LAN B (Faculty)** | `192.168.10.64` | `/27` | `255.255.255.224` | `192.168.10.65` | `192.168.10.94` | `192.168.10.95` | Gateway: R1 `Gi0/0/1` (`192.168.10.65`)<br>Faculty PCs: `192.168.10.70` - `192.168.10.94` |
| **Subnet 3: Server Farm** | `192.168.10.96` | `/28` | `255.255.255.240` | `192.168.10.97` | `192.168.10.110` | `192.168.10.111` | Gateway: R2 `Gi0/0/0` (`192.168.10.97`)<br>DNS Server: `192.168.10.100`<br>Web Server: `192.168.10.105` |
| **Subnet 4: WAN P2P (R1-R2)** | `192.168.10.112` | `/30` | `255.255.255.252` | `192.168.10.113` | `192.168.10.114` | `192.168.10.115` | R1 Serial `Se0/1/0`: `192.168.10.113`<br>R2 Serial `Se0/1/0`: `192.168.10.114` |
| **Subnet 5: Management** | `192.168.10.116` | `/30` | `255.255.255.252` | `192.168.10.117` | `192.168.10.118` | `192.168.10.119` | Out-of-band management loopbacks |
| **Unallocated / Reserved** | `192.168.10.120` | - | - | - | - | `192.168.10.255` | 136 Addresses preserved for future expansion |

---

## 4. Mathematical Verification of Subnet Boundaries

### Subnet 1: LAN A (`192.168.10.0/26`)
- **Binary Mask:** `11111111.11111111.11111111.11000000`
- **Block Size:** $256 - 192 = 64$
- **Network ID:** `192.168.10.0`
- **Broadcast:** $0 + 64 - 1 = 63 \implies$ `192.168.10.63`
- **Range:** `192.168.10.1` to `192.168.10.62`

### Subnet 2: LAN B (`192.168.10.64/27`)
- **Binary Mask:** `11111111.11111111.11111111.11100000`
- **Block Size:** $256 - 224 = 32$
- **Network ID:** `192.168.10.64`
- **Broadcast:** $64 + 32 - 1 = 95 \implies$ `192.168.10.95`
- **Range:** `192.168.10.65` to `192.168.10.94`

### Subnet 3: Server Farm (`192.168.10.96/28`)
- **Binary Mask:** `11111111.11111111.11111111.11110000`
- **Block Size:** $256 - 240 = 16$
- **Network ID:** `192.168.10.96`
- **Broadcast:** $96 + 16 - 1 = 111 \implies$ `192.168.10.111`
- **Range:** `192.168.10.97` to `192.168.10.110`

### Subnet 4: WAN Serial Link (`192.168.10.112/30`)
- **Binary Mask:** `11111111.11111111.11111111.11111100`
- **Block Size:** $256 - 252 = 4$
- **Network ID:** `192.168.10.112`
- **Broadcast:** $112 + 4 - 1 = 115 \implies$ `192.168.10.115`
- **Range:** `192.168.10.113` to `192.168.10.114`

### Overlap Check
$$[0, 63] \cap [64, 95] = \emptyset$$
$$[64, 95] \cap [96, 111] = \emptyset$$
$$[96, 111] \cap [112, 115] = \emptyset$$
$$\implies \textbf{Zero Subnet Overlaps. Plan is Mathematically Sound.}$$
