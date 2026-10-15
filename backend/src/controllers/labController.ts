import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { planVlsm } from '../utils/subnet.js';
import { vlsmCalculatorSchema } from '../validators/schema.js';
import { DiagnosisEngine, DiagnosticObservation } from '../diagnosis/diagnosisEngine.js';

export class LabController {
  private static routerConfigsDir = path.resolve(process.cwd(), '../network-lab/router-configs');

  public static async calculateVlsm(req: Request, res: Response): Promise<void> {
    const parseResult = vlsmCalculatorSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const { baseNetwork, baseCidr, requirements } = parseResult.data;
      const plan = planVlsm(baseNetwork, baseCidr, requirements);
      res.json(plan);
    } catch (err: any) {
      res.status(400).json({ error: 'VLSM calculation failed', message: err.message });
    }
  }

  public static async listConfigs(_req: Request, res: Response): Promise<void> {
    try {
      if (!fs.existsSync(LabController.routerConfigsDir)) {
        await fs.promises.mkdir(LabController.routerConfigsDir, { recursive: true });
      }

      const files = await fs.promises.readdir(LabController.routerConfigsDir);
      const configs = files.filter((f) => f.endsWith('.cfg') || f.endsWith('.txt'));

      const list = await Promise.all(
        configs.map(async (filename) => {
          const content = await fs.promises.readFile(path.join(LabController.routerConfigsDir, filename), 'utf-8');
          return {
            filename,
            title: filename.replace('.cfg', '').replace(/[-_]/g, ' ').toUpperCase(),
            linesCount: content.split('\n').length,
            preview: content.split('\n').slice(0, 8).join('\n'),
          };
        })
      );

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list router configs', message: err.message });
    }
  }

  public static async getConfigContent(req: Request, res: Response): Promise<void> {
    const filename = path.basename(req.params.filename); // Sanitize path traversal
    const targetFile = path.join(LabController.routerConfigsDir, filename);

    if (!fs.existsSync(targetFile)) {
      res.status(404).json({ error: `Config file "${filename}" not found` });
      return;
    }

    try {
      const content = await fs.promises.readFile(targetFile, 'utf-8');
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed reading config file', message: err.message });
    }
  }

  public static async compareLabEvidence(req: Request, res: Response): Promise<void> {
    const { target, observations, notes } = req.body;

    if (!target || !Array.isArray(observations)) {
      res.status(400).json({ error: 'Invalid payload. Target and observations array are required.' });
      return;
    }

    // Force evidence source to LAB_EVIDENCE
    const labObs: DiagnosticObservation[] = observations.map((o: any) => ({
      testName: o.testName || 'Packet Tracer Test',
      stage: o.stage || 'ROUTING',
      status: o.status || 'PASS',
      evidenceSource: 'LAB_EVIDENCE',
      details: o.details || 'Test executed in Cisco Packet Tracer virtual topology',
      metric: o.metric,
      limitations: 'Test result entered from Cisco Packet Tracer virtual simulation environment.',
    }));

    const report = DiagnosisEngine.evaluate(target, labObs, 'LAB_EVIDENCE');

    res.json({
      evidenceSource: 'LAB_EVIDENCE',
      notes,
      report,
      academicHonestyNotice:
        'This diagnostic report is computed using documented Cisco Packet Tracer lab test results. It is explicitly separated from host OS active network traffic.',
    });
  }
}
