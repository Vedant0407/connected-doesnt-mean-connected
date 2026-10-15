import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { TopologyPage } from './pages/TopologyPage';
import { DiagnosticWorkspacePage } from './pages/DiagnosticWorkspacePage';
import { PacketAnalyzerPage } from './pages/PacketAnalyzerPage';
import { ScenarioLabPage } from './pages/ScenarioLabPage';
import { PacketTracerHubPage } from './pages/PacketTracerHubPage';
import { ReportsHistoryPage } from './pages/ReportsHistoryPage';
import { ApiService } from './services/api';
import {
  ComprehensiveDiagnosisReport,
  StoredDiagnosticRecord,
  ToolsStatus,
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [toolsStatus, setToolsStatus] = useState<ToolsStatus | null>(null);
  const [latestReport, setLatestReport] = useState<ComprehensiveDiagnosisReport | null>(null);
  const [history, setHistory] = useState<StoredDiagnosticRecord[]>([]);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    // 1. Health check
    ApiService.getHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    // 2. Tools check
    ApiService.getToolsStatus()
      .then((data) => setToolsStatus(data))
      .catch((err) => console.error('Tools status error:', err));

    // 3. Load history
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    ApiService.getHistory()
      .then((data) => {
        setHistory(data);
        if (data.length > 0 && !latestReport) {
          setLatestReport(data[0].report);
        }
      })
      .catch((err) => console.error('History load error:', err));
  };

  const handleQuickRun = async (target: string) => {
    setIsRunningDiagnostic(true);
    try {
      const report = await ApiService.runDiagnostics({ target, testType: 'QUICK' });
      setLatestReport(report);
      refreshHistory();
      setActiveTab('workspace');
    } catch (err: any) {
      alert(`Diagnostic failed: ${err.message}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleSimulationApplied = (report: ComprehensiveDiagnosisReport) => {
    setLatestReport(report);
    refreshHistory();
    setActiveTab('topology');
  };

  const handleLabReport = (report: ComprehensiveDiagnosisReport) => {
    setLatestReport(report);
    refreshHistory();
    setActiveTab('workspace');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        toolsStatus={toolsStatus}
        backendOnline={backendOnline}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigate={setActiveTab}
            latestReport={latestReport}
            history={history}
            toolsStatus={toolsStatus}
            onQuickRun={handleQuickRun}
            isLoading={isRunningDiagnostic}
          />
        )}

        {activeTab === 'topology' && (
          <TopologyPage
            latestReport={latestReport}
            onRunTest={() => handleQuickRun(latestReport?.target || 'google.com')}
            isRunning={isRunningDiagnostic}
          />
        )}

        {activeTab === 'workspace' && (
          <DiagnosticWorkspacePage
            latestReport={latestReport}
            onRunSuccess={(report) => {
              setLatestReport(report);
              refreshHistory();
            }}
          />
        )}

        {activeTab === 'analyzer' && <PacketAnalyzerPage />}

        {activeTab === 'scenarios' && (
          <ScenarioLabPage onSimulationApplied={handleSimulationApplied} />
        )}

        {activeTab === 'lab' && (
          <PacketTracerHubPage onLabReportGenerated={handleLabReport} />
        )}

        {activeTab === 'history' && (
          <ReportsHistoryPage
            history={history}
            onSelectReport={(report) => {
              setLatestReport(report);
              setActiveTab('workspace');
            }}
            onRefreshHistory={refreshHistory}
          />
        )}
      </main>

      {/* Academic Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
        Connected Doesn't Mean Connected • Computer Networks Project • Academic Diagnostic & Packet Simulator
      </footer>
    </div>
  );
}

export default App;
