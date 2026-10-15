# Automated Testing & Verification Documentation

## 1. Testing Strategy & Philosophy

In compliance with the project guidelines:
- **No Mock Successes:** A test is only reported as passing if the assertion executed against real code or valid network payloads.
- **Academic Separation:** Automated tests clearly distinguish between unit logic, live OS calls, and synthetic scenario generation.
- **Security-First Validation:** Strict testing against shell injection, parameter tampering, and path traversal.

---

## 2. Test Suites Summary

The automated test suite is powered by **Vitest** and **Supertest** located in `backend/tests/`:

| Test Suite File | Focus Area | Tests Count | Status |
| :--- | :--- | :--- | :--- |
| **`tests/subnet.test.ts`** | IP/Subnet conversions, CIDR masks, boundary calculations, overlap detection, VLSM allocation | 7 Tests | **PASS** |
| **`tests/diagnosis.test.ts`** | Rule-based engine, all 8 failure state transitions, confidence scoring, alternative explanations | 7 Tests | **PASS** |
| **`tests/pcapParser.test.ts`** | Binary PCAP/PCAPNG parsing, DNS/TCP/ICMP frame decoding, error handling for corrupted files | 6 Tests | **PASS** |
| **`tests/api.test.ts`** | REST endpoints (`/api/health`, `/api/tools/status`, `/api/scenarios`), Zod validation, security rejection | 7 Tests | **PASS** |
| **Total Automated Tests** | **Comprehensive Full Stack Verification** | **27 Tests** | **100% PASS** |

---

## 3. How to Execute Tests

From the project root:
```bash
npm run test
```
Or inside the `backend/` directory:
```bash
cd backend
npm test
```

---

## 4. Test Matrix & Detailed Assertions

### A. Subnet and VLSM Calculations (`tests/subnet.test.ts`)
1. `ipToInt` and `intToIp` bitwise transformations (e.g. `192.168.1.1` $\leftrightarrow$ `3232235777`).
2. CIDR prefix to subnet mask mapping (`/24` $\rightarrow$ `255.255.255.0`, `/26` $\rightarrow$ `255.255.255.192`, `/30` $\rightarrow$ `255.255.255.252`).
3. Subnet mask to CIDR derivation.
4. Boundary computation for a `/26` block: verifying Network ID (`192.168.10.0`), Broadcast (`192.168.10.63`), First Usable (`192.168.10.1`), Last Usable (`192.168.10.62`), and Usable Hosts (`62`).
5. Inclusion test: `isIpInSubnet` returns true for `192.168.10.50` and false for `192.168.10.70`.
6. Subnet overlap detection: detects intersection between `192.168.1.0/24` and `192.168.1.128/25`.
7. VLSM planning engine: allocates non-overlapping blocks in descending order of requirement size.

### B. Diagnostic Rule Engine (`tests/diagnosis.test.ts`)
1. Physical / local interface down $\rightarrow$ `PHYSICAL_OR_LOCAL_INTERFACE`.
2. Default gateway unreachable $\rightarrow$ `DEFAULT_GATEWAY`.
3. DNS resolution failure $\rightarrow$ `DNS_RESOLUTION`.
4. Target TCP port closed (RST) $\rightarrow$ `TARGET_SERVICE_PORT`.
5. Packet loss / high jitter $\rightarrow$ `NETWORK_CONGESTION_PACKET_LOSS`.
6. All tests passing $\rightarrow$ `NONE_HEALTHY` (`CONNECTED_AND_HEALTHY`).
7. Empty observations $\rightarrow$ `INCONCLUSIVE`.

### C. Packet Parser Engine (`tests/pcapParser.test.ts`)
1. Rejection of truncated buffers (< 24 bytes).
2. Rejection of invalid magic headers.
3. Parsing `scenario-1-normal.pcap`: verifying DNS queries, responses, and TCP/HTTP frames.
4. Parsing `scenario-4-routing-failure.pcap`: detecting ICMP Type 3 Code 0 Destination Unreachable.
5. Parsing `scenario-5-dns-failure.pcap`: extracting NXDOMAIN (RCODE 3).
6. Parsing `scenario-6-service-closed.pcap`: detecting TCP RST flag.

### D. API Security & Validation (`tests/api.test.ts`)
1. Health endpoint returns HTTP 200 with uptime and platform.
2. Tools status endpoint accurately reports TShark presence and fallback status.
3. Scenario endpoint returns all 7 pre-packaged educational scenarios.
4. Interface endpoint lists network adapters without leaking secrets.
5. **Security Test:** Malicious shell characters (`;`, `&&`, `|`, spaces) in diagnostic target are strictly rejected by Zod with HTTP 400.
6. Out-of-bounds TCP port numbers (e.g. 999999) are rejected with HTTP 400.
7. VLSM API computes valid non-overlapping addressing plan.
