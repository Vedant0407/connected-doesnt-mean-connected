import { Request, Response } from 'express';
import { detectTshark } from '../analyzers/tsharkDetector.js';

export class HealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      service: 'Connected Doesn\'t Mean Connected - Diagnostics Engine',
    });
  }

  public static async getToolsStatus(_req: Request, res: Response): Promise<void> {
    const tsharkStatus = await detectTshark();

    res.json({
      tshark: tsharkStatus,
      systemTools: {
        pingAvailable: true,
        tracerouteAvailable: true,
        dnsResolverAvailable: true,
        socketApiAvailable: true,
      },
      environment: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
      },
    });
  }
}
