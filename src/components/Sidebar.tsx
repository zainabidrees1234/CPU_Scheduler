import { useState } from 'react';
import { Plus, Play, Pause, RotateCcw, PlayCircle, Zap, Lightbulb, AlertTriangle } from 'lucide-react';
import type { SchedulingAlgorithm, Process, PerformanceMetrics } from '../types';
import { RAM_MAX_SLOTS } from '../types';
import { adaptiveFeedback } from '../lib/simulation';

interface SidebarProps {
  processes: Process[];
  onAddProcess: (arrivalTime: number, burstTime: number, priority: number) => void;
  algorithm: SchedulingAlgorithm;
  onAlgorithmChange: (algo: SchedulingAlgorithm) => void;
  timeQuantum: number;
  onTimeQuantumChange: (tq: number) => void;
  mlfqLevels: number;
  onMlfqLevelsChange: (levels: number) => void;
  mlfqQuantums: number[];
  onMlfqQuantumsChange: (quantums: number[]) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReschedule: () => void;
  onReset: () => void;
  metrics: PerformanceMetrics;
  agingEnabled: boolean;
  agingInterval: number;
  onAgingEnabledChange: (enabled: boolean) => void;
  onAgingIntervalChange: (interval: number) => void;
  showAlgorithmChangeBanner?: boolean;
  onDismissAlgorithmChangeBanner?: () => void;
}

const ALGORITHM_OPTIONS: { value: SchedulingAlgorithm; label: string }[] = [
  { value: 'fcfs', label: 'FCFS' },
  { value: 'sjf-non-preemptive', label: 'SJF Non-Preemptive' },
  { value: 'sjf-preemptive', label: 'SJF Preemptive (SRTF)' },
  { value: 'priority-non-preemptive', label: 'Priority Non-Preemptive' },
  { value: 'priority-preemptive', label: 'Priority Preemptive' },
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'mlfq', label: 'MLFQ' },
];

export default function Sidebar({
  processes,
  onAddProcess,
  algorithm,
  onAlgorithmChange,
  timeQuantum,
  onTimeQuantumChange,
  mlfqLevels,
  onMlfqLevelsChange,
  mlfqQuantums,
  onMlfqQuantumsChange,
  speed,
  onSpeedChange,
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onReschedule,
  onReset,
  metrics,
  agingEnabled,
  agingInterval,
  onAgingEnabledChange,
  onAgingIntervalChange,
  showAlgorithmChangeBanner,
  onDismissAlgorithmChangeBanner,
}: SidebarProps) {
  const [arrivalTime, setArrivalTime] = useState(0);
  const [burstTime, setBurstTime] = useState(1);
  const [priority, setPriority] = useState(1);

  const activeCount = processes.filter(p => p.status !== 'Completed').length;
  const isRAMFull = activeCount >= RAM_MAX_SLOTS;
  const isPriorityAlgorithm = algorithm === 'priority-preemptive' || algorithm === 'priority-non-preemptive';

  const handleAdd = () => {
    if (burstTime <= 0 || isRAMFull) return;
    // Use priority value only for priority algorithms; otherwise use default 0
    const effectivePriority = isPriorityAlgorithm ? priority : 0;
    onAddProcess(arrivalTime, burstTime, effectivePriority);
    setArrivalTime(0);
    setBurstTime(1);
    setPriority(1);
  };

  const nextPid = `P${processes.length + 1}`;
  const feedback = adaptiveFeedback(algorithm, processes, metrics);

  return (
    <div className="w-64 min-w-[256px] h-screen bg-[#0c0c1e] border-r border-[#1a1a30] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a30]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00d4ff]" />
          <h1 className="text-sm font-bold tracking-tight text-white">CPU Scheduler</h1>
        </div>
        <p className="text-[10px] text-[#3a3a55] mt-0.5">Process Scheduling Simulator</p>
      </div>

      {/* Add Process */}
      <div className="px-4 py-3 border-b border-[#1a1a30]">
        <h2 className="section-label mb-2.5">Add Process</h2>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Process ID</label>
            <div className="input-field flex items-center text-[#00d4ff] font-semibold text-xs py-1.5">
              {nextPid}
              <span className="ml-auto text-[9px] text-[#3a3a55]">auto</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Arrival Time</label>
            <input
              type="number"
              min={0}
              value={arrivalTime}
              onChange={e => setArrivalTime(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field py-1.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Burst Time</label>
            <input
              type="number"
              min={1}
              value={burstTime}
              onChange={e => setBurstTime(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field py-1.5"
            />
          </div>
          {isPriorityAlgorithm && (
            <div>
              <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Priority</label>
              <input
                type="number"
                min={1}
                value={priority}
                onChange={e => setPriority(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field py-1.5"
              />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={isRAMFull}
            className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Process
          </button>
          {isRAMFull && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-[9px] text-red-400">RAM is full ({RAM_MAX_SLOTS}/{RAM_MAX_SLOTS})</span>
            </div>
          )}
        </div>
      </div>

      {/* Algorithm */}
      <div className="px-4 py-3 border-b border-[#1a1a30]">
        <h2 className="section-label mb-2.5">Algorithm</h2>
        <select
          value={algorithm}
          onChange={e => onAlgorithmChange(e.target.value as SchedulingAlgorithm)}
          className="input-field py-1.5 cursor-pointer text-xs"
        >
          {ALGORITHM_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {showAlgorithmChangeBanner && (
          <div className="mt-2 p-2 rounded-md bg-yellow-400/10 border border-yellow-600 text-[12px] text-yellow-300 flex items-start justify-between gap-2">
            <div>
              Algorithm changed. Click Reset then Start to simulate with {ALGORITHM_OPTIONS.find(o => o.value === algorithm)?.label}.
            </div>
            <button onClick={() => onDismissAlgorithmChangeBanner && onDismissAlgorithmChangeBanner()} className="ml-2 text-yellow-100 text-sm">Dismiss</button>
          </div>
        )}
        {algorithm === 'round-robin' && (
          <div className="mt-2">
            <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Time Quantum</label>
            <input
              type="number"
              min={1}
              value={timeQuantum}
              onChange={e => onTimeQuantumChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field py-1.5"
            />
          </div>
        )}
        {algorithm === 'mlfq' && (
          <div className="mt-3 pt-3 border-t border-[#1a1a35] space-y-2">
            <div>
              <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Queue Levels</label>
              <select
                value={mlfqLevels}
                onChange={e => {
                  const newLevels = Math.max(2, Math.min(4, parseInt(e.target.value)));
                  onMlfqLevelsChange(newLevels);
                  // Adjust quantums array to match levels (keep existing, pad or trim as needed)
                  const newQuantums = [...mlfqQuantums];
                  if (newQuantums.length < newLevels - 1) {
                    // Pad with doubled values
                    while (newQuantums.length < newLevels - 1) {
                      const lastVal = newQuantums[newQuantums.length - 1] || 4;
                      newQuantums.push(lastVal * 2);
                    }
                  } else if (newQuantums.length > newLevels - 1) {
                    // Trim
                    newQuantums.splice(newLevels - 1);
                  }
                  onMlfqQuantumsChange(newQuantums);
                }}
                className="input-field py-1.5 cursor-pointer text-xs"
              >
                <option value={2}>2 levels</option>
                <option value={3}>3 levels</option>
                <option value={4}>4 levels</option>
              </select>
            </div>
            {/* Quantum inputs for each level except the last (which is FCFS/Infinity) */}
            <div className="space-y-1.5">
              {Array.from({ length: mlfqLevels - 1 }).map((_, idx) => (
                <div key={idx}>
                  <label className="text-[10px] text-[#4a4a65] mb-0.5 block">
                    Q{idx} Quantum
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={mlfqQuantums[idx] || (idx === 0 ? 2 : 4)}
                    onChange={e => {
                      const newQuantums = [...mlfqQuantums];
                      newQuantums[idx] = Math.max(1, parseInt(e.target.value) || 1);
                      onMlfqQuantumsChange(newQuantums);
                    }}
                    className="input-field py-1.5"
                  />
                </div>
              ))}
              {/* Last level always FCFS (disabled, shows ∞) */}
              <div>
                <label className="text-[10px] text-[#4a4a65] mb-0.5 block">
                  Q{mlfqLevels - 1} (FCFS)
                </label>
                <div className="input-field py-1.5 text-[#00d4ff] font-semibold text-xs flex items-center justify-center cursor-not-allowed opacity-60">
                  ∞
                </div>
              </div>
            </div>
          </div>
        )}
        {isPriorityAlgorithm && (
          <div className="mt-2">
            <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Priority Aging</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={agingEnabled}
                onChange={e => onAgingEnabledChange(e.target.checked)}
                className="accent-[#00d4ff]"
              />
              <span className="text-[11px] text-[#8a8aa0]">Enable aging (prevent starvation)</span>
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-[#4a4a65] mb-0.5 block">Boost every (time units)</label>
              <input
                type="number"
                min={1}
                value={agingInterval}
                onChange={e => onAgingIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!agingEnabled}
                className="input-field py-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Speed */}
      <div className="px-4 py-3 border-b border-[#1a1a30]">
        <h2 className="section-label mb-2">Simulation Speed</h2>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#3a3a55]">Slow</span>
          <input
            type="range"
            min={1}
            max={10}
            value={speed}
            onChange={e => onSpeedChange(parseInt(e.target.value))}
            className="speed-slider flex-1"
          />
          <span className="text-[9px] text-[#3a3a55]">Fast</span>
        </div>
        <div className="text-center text-[10px] text-[#00d4ff] font-medium mt-1">{speed}x</div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-[#1a1a30]">
        <h2 className="section-label mb-2.5">Controls</h2>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={onStart} disabled={isRunning && !isPaused} className="btn-control btn-start disabled:opacity-30 disabled:cursor-not-allowed">
            <Play className="w-3 h-3" /> Start
          </button>
          <button onClick={onPause} disabled={!isRunning || isPaused} className="btn-control btn-pause disabled:opacity-30 disabled:cursor-not-allowed">
            <Pause className="w-3 h-3" /> Pause
          </button>
          <button onClick={onResume} disabled={!isPaused} className="btn-control btn-resume disabled:opacity-30 disabled:cursor-not-allowed">
            <PlayCircle className="w-3 h-3" /> Resume
          </button>
          <button onClick={onReset} className="btn-control btn-reset">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
        {isPaused && isRunning && (
          <button
            onClick={onReschedule}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-1.5 text-xs py-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Re-schedule
          </button>
        )}
      </div>

      {/* Adaptive Feedback */}
      <div className="px-4 py-3 mt-auto">
        <div className="glass-panel-accent p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[9px] uppercase tracking-wider text-[#00d4ff] font-semibold mb-1">Adaptive Feedback</h3>
              <p className="text-[11px] text-[#8a8aa0] leading-relaxed">{feedback}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Process count */}
      <div className="px-4 py-2 border-t border-[#1a1a30]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#3a3a55]">RAM Usage</span>
          <span className={`font-semibold ${isRAMFull ? 'text-red-400' : 'text-[#00d4ff]'}`}>
            {activeCount}/{RAM_MAX_SLOTS}
          </span>
        </div>
      </div>
    </div>
  );
}
