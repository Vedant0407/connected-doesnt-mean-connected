import { Request, Response } from 'express';
import { DiagnosticsService } from '../services/diagnosticsService.js';
import { DatabaseService } from '../services/databaseService.js';
import { compareRunsSchema, runDiagnosticSchema } from '../validators/schema.js';

export class DiagnosticsController {
  public static async runDiagnostics(req: Request, res: Response): Promise<void> {
    const parseResult = runDiagnosticSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const report = await DiagnosticsService.runDiagnostics(parseResult.data);
      res.status(200).json(report);
    } catch (err: any) {
      res.status(500).json({
        error: 'Diagnostic execution error',
        message: err.message,
      });
    }
  }

  public static async getHistory(_req: Request, res: Response): Promise<void> {
    try {
      const history = await DatabaseService.getAllHistory();
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve diagnostic history', message: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const record = await DatabaseService.getById(req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Diagnostic report not found' });
        return;
      }
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve report', message: err.message });
    }
  }

  public static async deleteById(req: Request, res: Response): Promise<void> {
    try {
      const success = await DatabaseService.deleteRecord(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      res.json({ message: 'Diagnostic report deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete report', message: err.message });
    }
  }

  public static async compareRuns(req: Request, res: Response): Promise<void> {
    const parseResult = compareRunsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const comparison = await DatabaseService.compareRuns(
        parseResult.data.runId1,
        parseResult.data.runId2
      );
      res.json(comparison);
    } catch (err: any) {
      res.status(400).json({ error: 'Comparison failed', message: err.message });
    }
  }
}
