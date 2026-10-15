import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService.js';
import { ReportService } from '../services/reportService.js';
import { exportReportSchema } from '../validators/schema.js';

export class ReportsController {
  public static async exportReport(req: Request, res: Response): Promise<void> {
    const parseResult = exportReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { reportId, format } = parseResult.data;
    const record = await DatabaseService.getById(reportId);

    if (!record) {
      res.status(404).json({ error: `Diagnostic report "${reportId}" not found` });
      return;
    }

    if (format === 'csv') {
      const csv = ReportService.exportCsv(record.report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="diagnostic_report_${reportId}.csv"`);
      res.send(csv);
    } else {
      const json = ReportService.exportJson(record.report);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="diagnostic_report_${reportId}.json"`);
      res.send(json);
    }
  }
}
