import { Cpu } from 'lucide-react';
import type { Process } from '../types';

interface CPUVisualizationProps {
  currentProcess: Process | null;
  isRunning: boolean;
}

export default function CPUVisualization({ currentProcess, isRunning }: CPUVisualizationProps) {
  const isIdle = !currentProcess;
  const progressPercent = currentProcess
    ? Math.round(((currentProcess.burstTime - currentProcess.remainingTime) / currentProcess.burstTime) * 100)
    : 0;

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-[#00d4ff]" />
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">CPU</h2>
        <span className={`ml-auto text-[9px] font-semibold ${isIdle ? 'text-[#3a3a55]' : 'text-emerald-400'}`}>
          {isIdle ? 'IDLE' : 'RUNNING'}
        </span>
      </div>

      <div className={`cpu-box ${isRunning && !isIdle ? 'cpu-box-active' : 'cpu-box-idle'} p-5 flex items-center gap-6`}>
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="5"
            />
            {currentProcess && (
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke={currentProcess.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isIdle ? (
              <span className="text-[10px] text-[#3a3a55] font-semibold">IDLE</span>
            ) : (
              <span className="text-sm font-bold" style={{ color: currentProcess!.color }}>
                {progressPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Process Info */}
        <div className="flex-1 min-w-0">
          {isIdle ? (
            <div className="text-center py-2">
              <p className="text-[#3a3a55] text-sm font-medium">No process running</p>
              <p className="text-[#2a2a40] text-[10px] mt-1">Waiting for scheduling...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <span className="text-[9px] text-[#4a4a65] uppercase tracking-wider">Current Process</span>
                <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: currentProcess!.color }}>
                  {currentProcess!.pid}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-[#4a4a65]">Remaining</span>
                  <p className="text-xs font-semibold text-[#b0b0c0]">{currentProcess!.remainingTime} units</p>
                </div>
                <div>
                  <span className="text-[9px] text-[#4a4a65]">Total Burst</span>
                  <p className="text-xs font-semibold text-[#b0b0c0]">{currentProcess!.burstTime} units</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
