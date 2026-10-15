import React from 'react';
import {
  Activity,
  Network,
  Terminal,
  FileSearch,
  BookOpen,
  Cpu,
  History,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ToolsStatus } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toolsStatus: ToolsStatus | null;
  backendOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  toolsStatus,
  backendOnline,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'topology', label: 'Interactive Topology', icon: Network },
    { id: 'workspace', label: 'Diagnostic Workspace', icon: Terminal },
    { id: 'analyzer', label: 'Packet Analyzer', icon: FileSearch },
    { id: 'scenarios', label: 'Educational Lab', icon: BookOpen },
    { id: 'lab', label: 'Packet Tracer & VLSM', icon: Cpu },
    { id: 'history', label: 'Reports & History', icon: History },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Titles */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Network className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                  CONNECTED DOESN'T MEAN CONNECTED
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-sky-950/60 text-sky-400 border border-sky-800 rounded">
                  v2.0 Academic
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                Interactive Network Connectivity & Failure Diagnosis Simulator
              </p>
            </div>
          </div>

          {/* System & Tool Badges */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
            {/* Backend Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                }`}
              />
              <span className="text-slate-300 hidden sm:inline">API:</span>
              <span className={backendOnline ? 'text-emerald-400' : 'text-rose-400'}>
                {backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* TShark / Native Parser Status */}
            {toolsStatus && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800"
                title={toolsStatus.tshark.diagnosticNotice}
              >
                {toolsStatus.tshark.isAvailable ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-300 hidden md:inline">Parser:</span>
                    <span className="text-emerald-400 font-semibold">TShark CLI</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-300 hidden md:inline">Parser:</span>
                    <span className="text-amber-400 font-medium">Native Parser</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
