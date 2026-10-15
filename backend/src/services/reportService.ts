import { ComprehensiveDiagnosisReport } from '../diagnosis/diagnosisEngine.js';

export class ReportService {
  public static exportJson(report: ComprehensiveDiagnosisReport): string {
    return JSON.stringify(report, null, 2);
  }

  public static exportCsv(report: ComprehensiveDiagnosisReport): string {
    const lines: string[] = [];

    // Header info
    lines.push('CONNECTED DOESN\'T MEAN CONNECTED - DIAGNOSTIC REPORT');
    lines.push(`Report ID,"${report.id}"`);
    lines.push(`Timestamp,"${report.timestamp}"`);
    lines.push(`Target,"${report.target}"`);
    lines.push(`Mode,"${report.mode}"`);
    lines.push(`Overall Status,"${report.overallStatus}"`);
    lines.push(`Most Likely Failure Point,"${report.mostLikelyFailurePoint}"`);
    lines.push(`Confidence Level,"${report.confidence}"`);
    lines.push(`Primary Diagnosis,"${report.primaryHeadline.replace(/"/g, '""')}"`);
    lines.push(`Root Cause,"${report.technicalRootCause.replace(/"/g, '""')}"`);
    lines.push('');

    // Detailed Observations table
    lines.push('Test Stage,Test Name,Status,Evidence Source,Details,Metric');
    for (const obs of report.observations) {
      const details = (obs.details || '').replace(/"/g, '""');
      lines.push(
        `"${obs.stage}","${obs.testName}","${obs.status}","${obs.evidenceSource}","${details}","${obs.metric ?? ''}"`
      );
    }
    lines.push('');

    // Recommendations
    lines.push('Recommended Actions');
    for (const step of report.recommendedSteps) {
      lines.push(`"- ${step.replace(/"/g, '""')}"`);
    }

    return lines.join('\n');
  }
}
