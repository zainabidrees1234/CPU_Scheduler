import { useState, useCallback, useRef, useEffect } from 'react';
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
  // Refs to store data that doesn't require re-renders
  const fullScheduleRef = useRef<GanttBlock[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const updatedProcessesRef = useRef<Process[]>([]);
  const finalMetricsRef = useRef<Metrics>({
    avgWaitingTime: 0,
    avgTurnaroundTime: 0,
    cpuUtilization: 0,
    throughput: 0,
    avgResponseTime: 0,
    completionOrder: [],
  });

  const [processes, setProcesses] = useState<Process[]>([]);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('fcfs');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
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

  const handleRemoveProcess = useCallback((id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleStart = useCallback(() => {
    if (processes.length === 0) return;

    // Run simulation — compute full schedule upfront
    const result = startSimulation(processes, algorithm, timeQuantum);
    fullScheduleRef.current = result.ganttBlocks;
    updatedProcessesRef.current = result.updatedProcesses;
    finalMetricsRef.current = result.metrics;

    // Initialize animation state
    setSimulationTime(0);
    setIsRunning(true);
    setIsPaused(false);
    setProcesses(result.updatedProcesses);
    setMetrics(result.metrics);
  }, [processes, algorithm, timeQuantum]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    setSimulationTime(0);
    processCounter = 0;
    fullScheduleRef.current = [];
    updatedProcessesRef.current = [];
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

  // ─────────────────────────────────────────────
  // ANIMATION LOOP: Tick simulation based on speed
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calculate delay: speed 1 = 1000ms, speed 10 = 100ms
    const delayMs = (11 - speed) * 100;

    intervalRef.current = setInterval(() => {
      setSimulationTime(prev => {
        // Find max time in schedule to know when to stop
        const maxTime =
          fullScheduleRef.current.length > 0
            ? Math.max(...fullScheduleRef.current.map(b => b.end))
            : 0;

        // Stop if we've reached the end
        if (prev >= maxTime) {
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return prev;
        }

        // Only increment if not paused
        if (!isPaused) {
          return prev + 1;
        }
        return prev;
      });
    }, delayMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, speed, isPaused]);

  // ─────────────────────────────────────────────
  // DERIVE ANIMATION STATE FROM simulationTime
  // ─────────────────────────────────────────────

  // Gantt blocks that have started (revealed) at current time
  const visibleGanttBlocks = fullScheduleRef.current.filter(
    block => block.end <= simulationTime
  );

  // Current process running at this moment
  const currentGanttBlock = fullScheduleRef.current.find(
    block => block.start <= simulationTime && simulationTime < block.end
  );
  const currentProcess =
    currentGanttBlock && currentGanttBlock.pid !== 'IDLE'
      ? processes.find(p => p.pid === currentGanttBlock.pid)
      : null;

  // Processes completed by current time
  const completedProcesses = processes.filter(
    p => p.completionTime !== null && p.completionTime <= simulationTime
  );

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
        <CompletedProcesses processes={completedProcesses} />
        <GanttChart ganttBlocks={visibleGanttBlocks} />
        <PerformanceMetrics metrics={metrics} />
      </div>
    </div>
  );
}

export default App;