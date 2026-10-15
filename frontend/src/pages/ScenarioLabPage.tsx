import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FileSearch,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { ComprehensiveDiagnosisReport, EducationalScenario } from '../types';

interface ScenarioLabPageProps {
  onSimulationApplied: (report: ComprehensiveDiagnosisReport) => void;
}

export const ScenarioLabPage: React.FC<ScenarioLabPageProps> = ({ onSimulationApplied }) => {
  const [scenarios, setScenarios] = useState<EducationalScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-1-normal');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    ApiService.getScenarios()
      .then((data) => setScenarios(data))
      .catch((err) => console.error('Failed loading scenarios:', err));
  }, []);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  const handleSimulate = async () => {
    if (!activeScenario) return;
    setIsSimulating(true);
    try {
      const res = await ApiService.simulateScenario(activeScenario.id);
      onSimulationApplied(res.diagnosis);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-teal-950/80 text-teal-300 border border-teal-800 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              ACADEMIC LABORATORY MODE
            </div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-400" />
              Educational Network Failure Scenario Lab
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any scenario below to study the underlying protocol failure, Cisco Packet Tracer configuration, and resulting packet evidence.
            </p>
          </div>

          <StatusBadge status="SIMULATED" size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scenario Selector List */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-400 block px-1">
            SELECT EDUCATIONAL SCENARIO:
          </span>
          {scenarios.map((sc) => {
            const isSelected = sc.id === activeScenarioId;
            return (
              <div
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-teal-500/80 shadow-md ring-1 ring-teal-500/30'
                    : 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-slate-200">{sc.title}</span>
                  <StatusBadge status="SIMULATED" size="sm" />
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{sc.summary}</p>
              </div>
            );
          })}
        </div>

        {/* Right Columns: Active Scenario Deep Dive */}
        {activeScenario && (
          <div className="lg:col-span-2 space-y-5">
            {/* Scenario Header Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{activeScenario.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{activeScenario.summary}</p>
                </div>
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-teal-900/30 transition cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                  {isSimulating ? 'Simulating...' : 'Simulate & Apply to Topology'}
                </button>
              </div>

              {/* Problem Statement & Academic Concept */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-mono block mb-1">PROBLEM STATEMENT</span>
                  <p className="text-slate-200 leading-relaxed">{activeScenario.problemStatement}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-teal-400 font-mono block mb-1">ACADEMIC CONCEPT</span>
                  <p className="text-slate-200 leading-relaxed">{activeScenario.academicConcept}</p>
                </div>
              </div>

              {/* Lab References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cisco Router Config</span>
                    <span className="text-slate-200 font-semibold">{activeScenario.ciscoConfigRef}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-purple-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">PCAP Capture Sample</span>
                    <span className="text-slate-200 font-semibold">{activeScenario.pcapSampleRef}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Observations Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                Simulated Test Telemetry
              </h4>

              <div className="space-y-2.5">
                {activeScenario.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">[{obs.stage}]</span>
                        <span className="text-slate-100 font-semibold">{obs.testName}</span>
                      </div>
                      <p className="text-slate-300 font-sans mt-1 text-[11px]">{obs.details}</p>
                    </div>
                    <StatusBadge status={obs.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Precomputed Conclusion Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-mono text-slate-400 block">
                ENGINE DIAGNOSTIC VERDICT (SIMULATED)
              </span>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-100">
                  {activeScenario.precomputedDiagnosis.primaryHeadline}
                </h4>
                <StatusBadge
                  status={activeScenario.precomputedDiagnosis.overallStatus}
                  size="md"
                />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeScenario.precomputedDiagnosis.technicalRootCause}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
