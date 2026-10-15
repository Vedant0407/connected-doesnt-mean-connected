import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { parseCaptureFile } from '../analyzers/pcapParser.js';
import { Logger } from '../utils/logger.js';

export class CapturesController {
  private static capturesDir = path.resolve(process.cwd(), '../network-lab/captures');

  public static async analyzeUpload(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No capture file uploaded. Please upload a .pcap or .pcapng file.' });
      return;
    }

    const tempPath = req.file.path;
    Logger.info(`Processing uploaded capture file: ${req.file.originalname} (${req.file.size} bytes)`);

    try {
      const result = await parseCaptureFile(tempPath);
      // Restore original filename in result for presentation
      result.fileName = req.file.originalname;
      res.json(result);
    } catch (err: any) {
      Logger.error(`Capture analysis failed: ${err.message}`);
      res.status(422).json({
        error: 'Capture analysis failed',
        message: err.message,
      });
    } finally {
      // Ensure temporary upload file is deleted to maintain privacy and disk hygiene
      try {
        if (fs.existsSync(tempPath)) {
          await fs.promises.unlink(tempPath);
        }
      } catch (cleanupErr: any) {
        Logger.warn(`Failed cleaning up temporary file ${tempPath}: ${cleanupErr.message}`);
      }
    }
  }

  public static async listSamples(_req: Request, res: Response): Promise<void> {
    try {
      if (!fs.existsSync(CapturesController.capturesDir)) {
        await fs.promises.mkdir(CapturesController.capturesDir, { recursive: true });
      }

      const files = await fs.promises.readdir(CapturesController.capturesDir);
      const pcapFiles = files.filter((f) => f.endsWith('.pcap') || f.endsWith('.pcapng'));

      const samples = await Promise.all(
        pcapFiles.map(async (filename) => {
          const filePath = path.join(CapturesController.capturesDir, filename);
          const stat = await fs.promises.stat(filePath);
          return {
            id: filename.replace(/\.(pcap|pcapng)$/, ''),
            fileName: filename,
            fileSizeBytes: stat.size,
            isSynthetic: true,
            label: filename
              .replace('.pcap', '')
              .replace(/[-_]/g, ' ')
              .toUpperCase(),
          };
        })
      );

      res.json(samples);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list sample captures', message: err.message });
    }
  }

  public static async analyzeSample(req: Request, res: Response): Promise<void> {
    const sampleId = req.params.id;
    const candidate1 = path.join(CapturesController.capturesDir, `${sampleId}.pcap`);
    const candidate2 = path.join(CapturesController.capturesDir, `${sampleId}.pcapng`);
    const candidate3 = path.join(CapturesController.capturesDir, sampleId);

    let targetPath = '';
    if (fs.existsSync(candidate1)) targetPath = candidate1;
    else if (fs.existsSync(candidate2)) targetPath = candidate2;
    else if (fs.existsSync(candidate3)) targetPath = candidate3;

    if (!targetPath) {
      res.status(404).json({ error: `Sample capture "${sampleId}" not found` });
      return;
    }

    try {
      const result = await parseCaptureFile(targetPath);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed analyzing sample capture', message: err.message });
    }
  }
}
