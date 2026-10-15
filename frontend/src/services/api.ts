import {
  CaptureAnalysisResult,
  ComprehensiveDiagnosisReport,
  EducationalScenario,
  StoredDiagnosticRecord,
  ToolsStatus,
  VlsmPlanResult,
} from '../types';

const BASE_URL = '/api';

export class ApiService {
  public static async getHealth(): Promise<any> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  public static async getToolsStatus(): Promise<ToolsStatus> {
    const res = await fetch(`${BASE_URL}/tools/status`);
    if (!res.ok) throw new Error('Tools status check failed');
    return res.json();
  }

  public static async getInterfaces(): Promise<any> {
    const res = await fetch(`${BASE_URL}/network/interfaces`);
    if (!res.ok) throw new Error('Failed to fetch network interfaces');
    return res.json();
  }

  public static async runDiagnostics(payload: {
    target: string;
    testType?: string;
    customDnsServer?: string;
    tcpPort?: number;
    runTraceroute?: boolean;
  }): Promise<ComprehensiveDiagnosisReport> {
    const res = await fetch(`${BASE_URL}/diagnostics/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Diagnostic run failed');
    }
    return res.json();
  }

  public static async getHistory(): Promise<StoredDiagnosticRecord[]> {
    const res = await fetch(`${BASE_URL}/diagnostics/history`);
    if (!res.ok) throw new Error('Failed to fetch diagnostic history');
    return res.json();
  }

  public static async getDiagnosticById(id: string): Promise<StoredDiagnosticRecord> {
    const res = await fetch(`${BASE_URL}/diagnostics/${id}`);
    if (!res.ok) throw new Error(`Diagnostic run "${id}" not found`);
    return res.json();
  }

  public static async deleteDiagnostic(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/diagnostics/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete report');
  }

  public static async compareRuns(runId1: string, runId2: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/diagnostics/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId1, runId2 }),
    });
    if (!res.ok) throw new Error('Failed to compare runs');
    return res.json();
  }

  public static async uploadCapture(file: File): Promise<CaptureAnalysisResult> {
    const formData = new FormData();
    formData.append('captureFile', file);

    const res = await fetch(`${BASE_URL}/captures/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to analyze capture');
    }
    return res.json();
  }

  public static async listSampleCaptures(): Promise<Array<{ id: string; fileName: string; fileSizeBytes: number; label: string }>> {
    const res = await fetch(`${BASE_URL}/captures/samples`);
    if (!res.ok) throw new Error('Failed to list sample captures');
    return res.json();
  }

  public static async analyzeSampleCapture(id: string): Promise<CaptureAnalysisResult> {
    const res = await fetch(`${BASE_URL}/captures/samples/${id}/analyze`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to analyze sample capture');
    return res.json();
  }

  public static async getScenarios(): Promise<EducationalScenario[]> {
    const res = await fetch(`${BASE_URL}/scenarios`);
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
  }

  public static async simulateScenario(id: string): Promise<{
    scenario: EducationalScenario;
    diagnosis: ComprehensiveDiagnosisReport;
    topology: any[];
  }> {
    const res = await fetch(`${BASE_URL}/scenarios/${id}/simulate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to simulate scenario');
    return res.json();
  }

  public static async calculateVlsm(payload: {
    baseNetwork: string;
    baseCidr: number;
    requirements: Array<{ name: string; requiredHosts: number }>;
  }): Promise<VlsmPlanResult> {
    const res = await fetch(`${BASE_URL}/lab/vlsm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'VLSM calculation failed');
    }
    return res.json();
  }

  public static async listConfigs(): Promise<Array<{ filename: string; title: string; linesCount: number; preview: string }>> {
    const res = await fetch(`${BASE_URL}/lab/configs`);
    if (!res.ok) throw new Error('Failed to list Cisco configs');
    return res.json();
  }

  public static async getConfigContent(filename: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/lab/configs/${filename}`);
    if (!res.ok) throw new Error('Failed to fetch Cisco config');
    return res.text();
  }

  public static async compareLabEvidence(payload: {
    target: string;
    observations: any[];
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/lab/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit lab evidence');
    return res.json();
  }

  public static async exportReport(reportId: string, format: 'json' | 'csv'): Promise<void> {
    const res = await fetch(`${BASE_URL}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, format }),
    });
    if (!res.ok) throw new Error('Failed to export report');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic_report_${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}
