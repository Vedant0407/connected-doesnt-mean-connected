import fs from 'fs';
import path from 'path';
import { ComprehensiveDiagnosisReport } from '../diagnosis/diagnosisEngine.js';
import { Logger } from '../utils/logger.js';

export interface StoredDiagnosticRecord {
  id: string;
  timestamp: string;
  target: string;
  mode: string;
  testType: string;
  overallStatus: string;
  mostLikelyFailurePoint: string;
  confidence: string;
  primaryHeadline: string;
  technicalRootCause: string;
  report: ComprehensiveDiagnosisReport;
}

export class DatabaseService {
  private static dataDir = path.resolve(process.cwd(), 'data');
  private static historyFile = path.resolve(DatabaseService.dataDir, 'history.json');

  private static async ensureInitialized(): Promise<void> {
    try {
      if (!fs.existsSync(DatabaseService.dataDir)) {
        await fs.promises.mkdir(DatabaseService.dataDir, { recursive: true });
      }
      if (!fs.existsSync(DatabaseService.historyFile)) {
        await fs.promises.writeFile(DatabaseService.historyFile, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err: any) {
      Logger.error(`DatabaseService init error: ${err.message}`);
    }
  }

  public static async getAllHistory(): Promise<StoredDiagnosticRecord[]> {
    await DatabaseService.ensureInitialized();
    try {
      const data = await fs.promises.readFile(DatabaseService.historyFile, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err: any) {
      Logger.warn(`Failed reading history file: ${err.message}`);
      return [];
    }
  }

  public static async getById(id: string): Promise<StoredDiagnosticRecord | undefined> {
    const list = await DatabaseService.getAllHistory();
    return list.find((item) => item.id === id);
  }

  public static async saveRecord(
    report: ComprehensiveDiagnosisReport,
    testType: string = 'COMPREHENSIVE'
  ): Promise<StoredDiagnosticRecord> {
    await DatabaseService.ensureInitialized();
    const list = await DatabaseService.getAllHistory();

    const record: StoredDiagnosticRecord = {
      id: report.id,
      timestamp: report.timestamp,
      target: report.target,
      mode: report.mode,
      testType,
      overallStatus: report.overallStatus,
      mostLikelyFailurePoint: report.mostLikelyFailurePoint,
      confidence: report.confidence,
      primaryHeadline: report.primaryHeadline,
      technicalRootCause: report.technicalRootCause,
      report,
    };

    // Prepend to show most recent first, limit to 100 entries
    const updated = [record, ...list.filter((r) => r.id !== report.id)].slice(0, 100);
    await fs.promises.writeFile(DatabaseService.historyFile, JSON.stringify(updated, null, 2), 'utf-8');
    return record;
  }

  public static async deleteRecord(id: string): Promise<boolean> {
    await DatabaseService.ensureInitialized();
    const list = await DatabaseService.getAllHistory();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      await fs.promises.writeFile(DatabaseService.historyFile, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
    return false;
  }

  public static async compareRuns(
    id1: string,
    id2: string
  ): Promise<{
    run1: StoredDiagnosticRecord;
    run2: StoredDiagnosticRecord;
    comparison: {
      statusMatch: boolean;
      failurePointMatch: boolean;
      targetMatch: boolean;
      summary: string;
      differences: string[];
    };
  }> {
    const run1 = await DatabaseService.getById(id1);
    const run2 = await DatabaseService.getById(id2);

    if (!run1 || !run2) {
      throw new Error(`One or both diagnostic runs (${id1}, ${id2}) could not be found.`);
    }

    const differences: string[] = [];
    if (run1.overallStatus !== run2.overallStatus) {
      differences.push(`Overall status changed from ${run1.overallStatus} to ${run2.overallStatus}`);
    }
    if (run1.mostLikelyFailurePoint !== run2.mostLikelyFailurePoint) {
      differences.push(
        `Failure point diagnosis differed: [Run 1: ${run1.mostLikelyFailurePoint}] vs [Run 2: ${run2.mostLikelyFailurePoint}]`
      );
    }
    if (run1.target !== run2.target) {
      differences.push(`Target differed: ${run1.target} vs ${run2.target}`);
    }

    return {
      run1,
      run2,
      comparison: {
        statusMatch: run1.overallStatus === run2.overallStatus,
        failurePointMatch: run1.mostLikelyFailurePoint === run2.mostLikelyFailurePoint,
        targetMatch: run1.target === run2.target,
        summary:
          differences.length === 0
            ? 'Both diagnostic runs produced identical conclusions.'
            : `Detected ${differences.length} variance(s) between the two runs.`,
        differences,
      },
    };
  }
}
