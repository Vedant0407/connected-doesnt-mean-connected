# Installation & Setup Guide

## 1. System Requirements & Prerequisites

- **Operating System:** Windows 10/11 (Primary), Ubuntu/Debian 20.04+, or macOS 12+
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** `npm` (v9.0.0+) or `yarn` / `pnpm`
- **Optional Network Tools:**
  - **Wireshark / TShark:** For deep CLI packet capture inspection.
  - **Cisco Packet Tracer:** (v7.3 or v8.0+) for running the virtual lab topology.

---

## 2. Quick Start (Root Orchestration)

From the project root directory (`connected-doesnt-mean-connected/`):

```bash
# 1. Install root, backend, and frontend dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. Generate educational synthetic PCAP captures
npm run generate-pcaps

# 3. Start both Backend (Port 5001) and Frontend (Port 5173) concurrently
npm run dev
```

The application will be accessible at:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API & Health:** [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 3. Independent Service Setup

### Backend Only:
```bash
cd backend
npm install
npm run dev
# Server boots on http://localhost:5001
```

### Frontend Only:
```bash
cd frontend
npm install
npm run dev
# Vite dev server boots on http://localhost:5173
```

---

## 4. Optional Tool Installation Guides

### A. Wireshark / TShark (Optional)
The application includes a built-in native pure-TypeScript PCAP/PCAPNG parser that operates with **zero external dependencies**. However, if you wish to enable the TShark CLI engine:

- **Windows:**
  1. Download the installer from [wireshark.org](https://www.wireshark.org/download.html).
  2. During installation, ensure **"Install TShark"** and **"Install Npcap"** are selected.
  3. Default path `C:\Program Files\Wireshark\tshark.exe` is automatically detected by the backend.
  4. If installed to a custom directory, set `TSHARK_PATH="C:\\path\\to\\tshark.exe"` in `backend/.env`.

- **Ubuntu / Debian:**
  ```bash
  sudo apt update
  sudo apt install tshark wireshark
  ```

- **macOS:**
  ```bash
  brew install wireshark
  ```

### B. Cisco Packet Tracer
1. Download Cisco Packet Tracer from the Cisco Networking Academy portal ([netacad.com](https://www.netacad.com)).
2. Open Packet Tracer and load the configurations from `network-lab/router-configs/`.

---

## 5. Environment Configuration (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5001` | Backend HTTP port |
| `HOST` | `127.0.0.1` | Server binding address |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`) |
| `DEFAULT_DNS_TIMEOUT_MS` | `3000` | DNS query resolution timeout |
| `DEFAULT_PING_TIMEOUT_MS` | `4000` | ICMP Ping execution timeout |
| `DEFAULT_TCP_TIMEOUT_MS` | `3000` | TCP port socket timeout |
| `MAX_CAPTURE_FILE_SIZE_MB`| `25` | Max PCAP upload file size limit |
| `TSHARK_PATH` | *(Auto-detected)* | Custom path to `tshark.exe` if not in standard PATH |
