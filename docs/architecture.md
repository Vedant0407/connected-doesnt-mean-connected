# System Architecture & Technical Specification

## 1. High-Level Architecture Overview

**CONNECTED DOESN'T MEAN CONNECTED** is an evidence-based network diagnosis simulator and packet analysis platform. It links academic network topologies (Cisco Packet Tracer) with actual operating system diagnostics and packet capture analysis (TShark / Native PCAP Parser).

```mermaid
flowchart TD
    subgraph Frontend ["Frontend Layer (React + TypeScript + Vite + Tailwind CSS)"]
        Dashboard["Dashboard & Metrics Overview"]
        Topology["Interactive React Flow Network Topology"]
        Workspace["Diagnostic Workspace (Live Test Runner)"]
        Analyzer["Packet Analyzer & Deep-Packet Inspector"]
        LabHub["Packet Tracer & VLSM Lab Hub"]
        History["Diagnostic Reports & Historical Diff Engine"]
    end

    subgraph BackendGateway ["Backend API Gateway (Express + TypeScript + Zod)"]
        Router["Express REST API Router (/api)"]
        Validator["Zod Strict Request Validator"]
        Database["Local Storage Service (JSON / SQLite)"]
    end

    subgraph Engines ["Core Analytical Engines"]
        DiagEngine["Diagnosis Correlation Engine\n(Rule-based Multi-layer Inference)"]
        SubnetEngine["VLSM & Subnet Calculator Engine"]
    end

    subgraph NetworkAdapters ["Network Execution & Analysis Adapters"]
        OSAdapter["OS Subprocess Safe Executor\n(ping, tracert, route print)"]
        DNSAdapter["Node.js DNS Resolver Module"]
        TCPAdapter["Node.js Net Socket Handshake Analyzer"]
        DualPcap["Dual-Engine Packet Capture Parser\n(TShark CLI / Native Pure-TS PCAP Parser)"]
    end

    subgraph AcademicLab ["Academic Lab Materials"]
        PTGuides["Cisco Packet Tracer Topology (.pkt)"]
        IOSConfigs["Cisco IOS Router Configs (.cfg)"]
        VLSMDoc["VLSM Addressing Specifications"]
    end

    Frontend <--> |REST API / JSON| Router
    Router --> Validator
    Validator --> Engines
    Engines <--> Database
    Engines --> NetworkAdapters
    LabHub <--> AcademicLab
```

---

## 2. The Evidence-Based Diagnostic Pipeline

Rather than displaying hardcoded mock data, every diagnostic report is generated from concrete observations across five OSI layers:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Frontend
    participant API as Express API
    participant Engine as Diagnosis Engine
    participant Net as OS / Network Adapters
    participant DB as Local Database

    User->>UI: Enter Target ("google.com" / "192.168.10.50")
    UI->>API: POST /api/diagnostics/run
    API->>Net: 1. Inspect Local Interface & Gateway (route print / ip route)
    Net-->>API: Interface IP, MAC, Subnet, Gateway IP
    API->>Net: 2. Ping Default Gateway (3x ICMP Echo)
    Net-->>API: Gateway RTT & Packet Loss
    API->>Net: 3. Resolve Target Hostname (Node DNS Resolver)
    Net-->>API: A / AAAA Records & Query Latency
    API->>Net: 4. Ping Resolved IP (3x ICMP Echo)
    Net-->>API: Destination RTT & Packet Loss
    API->>Net: 5. TCP Handshake to Port 80/443 (Net Socket)
    Net-->>API: Socket State (SYN-ACK / RST / Timeout)
    API->>Engine: Evaluate Observations
    Engine->>Engine: Correlate Findings & Isolate Failure Point
    Engine-->>API: Comprehensive Diagnosis Report
    API->>DB: Save Diagnostic Record
    API-->>UI: Return Structured Report & Node States
    UI-->>User: Animate Topology Flow & Highlight Failure Node
```

---

## 3. Strict Evidence Attribution & Academic Honesty

The system strictly tags every single finding with its concrete evidence origin:

| Evidence Tag | Description | Guarantee |
| :--- | :--- | :--- |
| **`LIVE_TEST`** | Real network packets transmitted by host OS network interface | Measured live; includes real latencies, timeouts, and socket responses. |
| **`CAPTURE_ANALYSIS`** | Parsed directly from uploaded PCAP/PCAPNG capture file | Sourced from frame headers parsed by TShark or Native PCAP Parser. |
| **`LAB_EVIDENCE`** | Documented Cisco Packet Tracer virtual topology test results | Derived from simulated Cisco IOS virtual environment. |
| **`SIMULATED`** | Pre-packaged educational failure scenario | Labeled clearly for demonstration and student learning. |

---

## 4. Dual-Engine PCAP/PCAPNG Parser Architecture

To ensure 100% platform portability across any lab machine without requiring administrator privileges or pre-installed tools:

1. **Primary Engine (TShark):**
   - Automatically detected in system `PATH` and standard installation paths (`C:\Program Files\Wireshark\tshark.exe`, `/usr/bin/tshark`, etc.).
   - Executes non-interactively with strict subprocess timeouts (`-T fields`).
2. **Fallback Engine (Native Pure-TS PCAP/PCAPNG Parser):**
   - Built directly into the backend with zero native dependencies.
   - Decodes Ethernet, IPv4, IPv6, TCP, UDP, ICMP, and DNS protocols directly from raw binary buffers.
   - Parses both Classic PCAP (`0xa1b2c3d4`, `0xd4c3b2a1`) and PCAPNG Section Header Blocks (`0x0A0D0D0A`).
