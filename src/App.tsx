import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import RAMVisualization from './components/RAMVisualization';
import ReadyQueue from './components/ReadyQueue';
import CPUVisualization from './components/CPUVisualization';
import CompletedProcesses from './components/CompletedProcesses';
import GanttChart from './components/GanttChart';
import PerformanceMetrics from './components/PerformanceMetrics';
import { startSimulation } from './lib/simulation';
import type { Process, SchedulingAlgorithm, GanttBlock, PerformanceMetrics as Metrics } from './types';
import { PROCESS_COLORS, RAM_MAX_SLOTS } from './types';

let processCounter = 0;

function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('fcfs');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ganttBlocks, setGanttBlocks] = useState<GanttBlock[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    avgWaitingTime: 0,
    avgTurnaroundTime: 0,
    cpuUtilization: 0,
    throughput: 0,
    avgResponseTime: 0,
    completionOrder: [],
  });

  const handleAddProcess = useCallback((arrivalTime: number, burstTime: number, priority: number) => {
    const activeCount = processes.filter(p => p.status !== 'Completed').length;
    if (activeCount >= RAM_MAX_SLOTS) return;

    processCounter++;
    const color = PROCESS_COLORS[(processCounter - 1) % PROCESS_COLORS.length];
    const newProcess: Process = {
      id: `proc-${processCounter}-${Date.now()}`,
      pid: `P${processCounter}`,
      arrivalTime,
      burstTime,
      priority,
      status: 'Ready',
      remainingTime: burstTime,
      startTime: null,
      completionTime: null,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0,
      color,
      ramSlot: null,
    };
    setProcesses(prev => [...prev, newProcess]);
  }, [processes]);

  const handleStart = useCallback(() => {
    if (processes.length === 0) return;
    setIsRunning(true);
    setIsPaused(false);

    const result = startSimulation(processes, algorithm, timeQuantum);
    setGanttBlocks(result.ganttBlocks);
    setMetrics(result.metrics);

    setProcesses(prev =>
      prev.map(p => ({ ...p, status: 'Completed' as const }))
    );
  }, [processes, algorithm, timeQuantum]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    processCounter = 0;
    setGanttBlocks([]);
    setMetrics({
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      avgResponseTime: 0,
      completionOrder: [],
    });
    setProcesses([]);
  }, []);

  const currentProcess = processes.find(p => p.status === 'Running') || null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a]">
      {/* LEFT COLUMN — Controls */}
      <Sidebar
        processes={processes}
        onAddProcess={handleAddProcess}
        algorithm={algorithm}
        onAlgorithmChange={setAlgorithm}
        timeQuantum={timeQuantum}
        onTimeQuantumChange={setTimeQuantum}
        speed={speed}
        onSpeedChange={setSpeed}
        isRunning={isRunning}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        metrics={metrics}
      />

      {/* MIDDLE COLUMN — RAM + Ready Queue */}
      <div className="w-64 min-w-[256px] h-screen border-r border-[#1a1a30] flex flex-col p-3 gap-3">
        {/* RAM — takes remaining space, scrollable */}
        <div className="flex-1 min-h-0">
          <RAMVisualization processes={processes} />
        </div>

        {/* Flow indicator */}
        <div className="flex items-center justify-center gap-2 py-0.5 flex-shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
          <span className="text-[8px] text-[#2a2a45] uppercase tracking-widest">flow</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
        </div>

        {/* Ready Queue — fixed at bottom */}
        <div className="flex-shrink-0">
          <ReadyQueue processes={processes} />
        </div>
      </div>

      {/* RIGHT COLUMN — CPU + Gantt + Metrics */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <CPUVisualization currentProcess={currentProcess} isRunning={isRunning} />
        <CompletedProcesses processes={processes} />
        <GanttChart ganttBlocks={ganttBlocks} />
        <PerformanceMetrics metrics={metrics} />
      </div>
    </div>
  );
}

export default App;
