import fs from 'fs';
import path from 'path';
import { safeExec } from '../utils/exec.js';
import { Logger } from '../utils/logger.js';

export interface TsharkStatus {
  isAvailable: boolean;
  version?: string;
  executablePath?: string;
  backendParser: 'TSHARK' | 'NATIVE_PCAP_PARSER';
  diagnosticNotice: string;
  installationGuide: {
    windows: string;
    linux: string;
    macos: string;
    downloadUrl: string;
  };
}

export async function detectTshark(): Promise<TsharkStatus> {
  const customPath = process.env.TSHARK_PATH;
  const candidatePaths: string[] = [];

  if (customPath) {
    candidatePaths.push(customPath);
  }

  // Common PATH binary
  candidatePaths.push('tshark');

  // Common Windows installation locations
  if (process.platform === 'win32') {
    candidatePaths.push('C:\\Program Files\\Wireshark\\tshark.exe');
    candidatePaths.push('C:\\Program Files (x86)\\Wireshark\\tshark.exe');
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      candidatePaths.push(path.join(localAppData, 'Programs', 'Wireshark', 'tshark.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidatePaths.push('/Applications/Wireshark.app/Contents/MacOS/tshark');
    candidatePaths.push('/usr/local/bin/tshark');
    candidatePaths.push('/opt/homebrew/bin/tshark');
  } else {
    // Linux
    candidatePaths.push('/usr/bin/tshark');
    candidatePaths.push('/usr/local/bin/tshark');
  }

  for (const binPath of candidatePaths) {
    // If it's an absolute path, verify existence first
    if (path.isAbsolute(binPath) && !fs.existsSync(binPath)) {
      continue;
    }

    try {
      const res = await safeExec(binPath, ['-v'], 3000);
      if (res.exitCode === 0 && res.stdout.toLowerCase().includes('tshark')) {
        const firstLine = res.stdout.split('\n')[0].trim();
        Logger.info(`TShark detected: ${firstLine} at ${binPath}`);
        return {
          isAvailable: true,
          version: firstLine,
          executablePath: binPath,
          backendParser: 'TSHARK',
          diagnosticNotice: `TShark is installed and operational (${firstLine}). Full CLI deep-packet inspection enabled.`,
          installationGuide: getInstallGuide(),
        };
      }
    } catch {
      // Continue checking next candidate
    }
  }

  Logger.info('TShark not found in PATH or standard directories. Native built-in PCAP/PCAPNG parser is active.');

  return {
    isAvailable: false,
    backendParser: 'NATIVE_PCAP_PARSER',
    diagnosticNotice: 'Wireshark/TShark CLI is not detected on this system. The built-in native TypeScript PCAP/PCAPNG parser is active to parse Ethernet, IPv4/IPv6, TCP, UDP, ICMP, and DNS packets without external dependencies.',
    installationGuide: getInstallGuide(),
  };
}

function getInstallGuide() {
  return {
    windows: 'Download the official Wireshark Windows installer from wireshark.org. Make sure to check "Install TShark" and "Install Npcap" during installation.',
    linux: 'Run "sudo apt update && sudo apt install tshark wireshark" (Debian/Ubuntu) or "sudo dnf install wireshark-cli" (Fedora/RHEL).',
    macos: 'Run "brew install wireshark" using Homebrew, or install Wireshark.dmg and link /Applications/Wireshark.app/Contents/MacOS/tshark.',
    downloadUrl: 'https://www.wireshark.org/download.html',
  };
}
