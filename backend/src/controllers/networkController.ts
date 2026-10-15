import { Request, Response } from 'express';
import { analyzeLocalNetwork } from '../analyzers/interfaceAnalyzer.js';

export class NetworkController {
  public static async getInterfaces(_req: Request, res: Response): Promise<void> {
    try {
      const state = await analyzeLocalNetwork();
      res.json(state);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to inspect local network interfaces',
        message: err.message,
      });
    }
  }
}
