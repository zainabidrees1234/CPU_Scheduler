import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RAMVisualization from './components/RAMVisualization';
import ReadyQueue from './components/ReadyQueue';
import CPUVisualization from './components/CPUVisualization';
import CompletedProcesses from './components/CompletedProcesses';
import ProcessTable from './components/ProcessTable';
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
  const [animProcesses, setAnimProcesses] = useState<Process[]>([]);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('fcfs');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [mlfqLevels, setMlfqLevels] = useState(3);
  const [mlfqQuantums, setMlfqQuantums] = useState<number[]>([2, 4]);
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
  const [agingEnabled, setAgingEnabled] = useState(false);
  const [agingInterval, setAgingInterval] = useState(5);
  const [showAlgorithmChangeBanner, setShowAlgorithmChangeBanner] = useState(false);
  const prevAlgorithmRef = useRef<SchedulingAlgorithm>(algorithm);

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

  const handleEditProcess = useCallback((id: string, updatedFields: { arrivalTime: number; burstTime: number; priority: number }) => {
    // Editing only allowed before simulation starts
    if (isRunning) return;
    
    setProcesses(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              arrivalTime: updatedFields.arrivalTime,
              burstTime: updatedFields.burstTime,
              priority: updatedFields.priority,
              remainingTime: updatedFields.burstTime, // Reset remaining time
            }
          : p
      )
    );
  }, [isRunning]);

  // Compute live animation snapshot from the full gantt and current time
  function computeAnimationState(
    originalProcesses: Process[],
    ganttBlocks: GanttBlock[],
    currentTime: number
  ): Process[] {
    return originalProcesses.map(proc => {
      const blocksForProc = ganttBlocks.filter(
        b => b.pid === proc.pid && b.pid !== 'IDLE'
      );

      const totalRunSoFar = blocksForProc.reduce((sum, b) => {
        const contributed = Math.min(b.end, currentTime) - Math.min(b.start, currentTime);
        return sum + Math.max(0, contributed);
      }, 0);

      const remaining = Math.max(0, proc.burstTime - totalRunSoFar);

      const isCurrentlyRunning = blocksForProc.some(
        b => b.start <= currentTime && currentTime < b.end
      );

      const isCompleted = blocksForProc.some(b => b.end <= currentTime) && remaining === 0;

      let status: Process['status'];
      if (isCurrentlyRunning) status = 'Running';
      else if (isCompleted) status = 'Completed';
      else if (proc.arrivalTime <= currentTime && !isCompleted) status = 'Ready';
      else status = 'Waiting';

      return {
        ...proc,
        remainingTime: remaining,
        status,
      };
    });
  }

  const handleStart = useCallback(() => {
    if (processes.length === 0) return;

    // Run simulation — compute full schedule upfront
    const result = startSimulation(processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingEnabled ? agingInterval : 0);
    fullScheduleRef.current = result.ganttBlocks;
    updatedProcessesRef.current = result.updatedProcesses;
    finalMetricsRef.current = result.metrics;

    // Initialize animation state
    setSimulationTime(0);
    setIsRunning(true);
    setIsPaused(false);
    // Do not replace the canonical `processes` state with final results here.
    // Instead compute initial animation snapshot at time=0.
    setAnimProcesses(computeAnimationState(processes, result.ganttBlocks, 0));
    setMetrics(result.metrics);
  }, [processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingEnabled, agingInterval]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleReschedule = useCallback(() => {
    if (processes.length === 0) return;

    // Re-run simulation with all processes (original + newly added)
    const result = startSimulation(processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingEnabled ? agingInterval : 0);
    fullScheduleRef.current = result.ganttBlocks;
    updatedProcessesRef.current = result.updatedProcesses;
    finalMetricsRef.current = result.metrics;
    // Reset animation state to restart from beginning
    setSimulationTime(0);
    setIsPaused(false); // Auto-resume
    // Do not overwrite canonical `processes`; compute initial animation snapshot
    setAnimProcesses(computeAnimationState(processes, result.ganttBlocks, 0));
    setMetrics(result.metrics);
  }, [processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingEnabled, agingInterval]);

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
    setAnimProcesses([]);
    setShowAlgorithmChangeBanner(false);
  }, []);

  // Show banner when algorithm changes after a run has occurred
  useEffect(() => {
    if (prevAlgorithmRef.current !== algorithm) {
      // If there is an existing schedule or simulation progressed, show banner
      const hadRun = isRunning || simulationTime > 0 || fullScheduleRef.current.length > 0;
      if (hadRun) setShowAlgorithmChangeBanner(true);
      prevAlgorithmRef.current = algorithm;
    }
  }, [algorithm, isRunning, simulationTime]);

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

    // Calculate delay: speed mapping -> delay = round(800 / speed)
    const delayMs = Math.round(800 / Math.max(1, speed));

    intervalRef.current = setInterval(() => {
      setSimulationTime(prev => {
        // Find max time in schedule to know when to stop
        const maxTime =
          fullScheduleRef.current.length > 0
            ? Math.max(...fullScheduleRef.current.map(b => b.end))
            : 0;

        // Stop if we've reached the end — finalize anim state
        if (prev >= maxTime) {
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Lock final animation snapshot
          setAnimProcesses(computeAnimationState(processes, fullScheduleRef.current, maxTime));
          return prev;
        }

        // Only increment if not paused
        if (!isPaused) {
          const newTime = prev + 1;
          setAnimProcesses(computeAnimationState(processes, fullScheduleRef.current, newTime));
          return newTime;
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
      ? animProcesses.find(p => p.pid === currentGanttBlock.pid) || null
      : null;

  // Processes completed by current time (from animation snapshot)
  const completedProcesses = animProcesses.filter(p => p.status === 'Completed');

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
        mlfqLevels={mlfqLevels}
        onMlfqLevelsChange={setMlfqLevels}
        mlfqQuantums={mlfqQuantums}
        onMlfqQuantumsChange={setMlfqQuantums}
        speed={speed}
        onSpeedChange={setSpeed}
        isRunning={isRunning}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReschedule={handleReschedule}
        onReset={handleReset}
        metrics={metrics}
        agingEnabled={agingEnabled}
        agingInterval={agingInterval}
        onAgingEnabledChange={setAgingEnabled}
        onAgingIntervalChange={setAgingInterval}
        showAlgorithmChangeBanner={showAlgorithmChangeBanner}
        onDismissAlgorithmChangeBanner={() => setShowAlgorithmChangeBanner(false)}
      />

      {/* MIDDLE COLUMN — RAM + Ready Queue */}
      <div className="w-64 min-w-[256px] h-screen border-r border-[#1a1a30] flex flex-col p-3 gap-3">
        {/* RAM — takes remaining space, scrollable */}
        <div className="flex-1 min-h-0">
          <RAMVisualization processes={animProcesses} />
        </div>

        {/* Flow indicator */}
        <div className="flex items-center justify-center gap-2 py-0.5 flex-shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
          <span className="text-[8px] text-[#2a2a45] uppercase tracking-widest">flow</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
        </div>

        {/* Ready Queue — fixed at bottom */}
        <div className="flex-shrink-0">
          <ReadyQueue processes={animProcesses} />
        </div>
      </div>

      {/* RIGHT COLUMN — CPU + Gantt + Metrics */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <CPUVisualization currentProcess={currentProcess} isRunning={isRunning} />
        <CompletedProcesses processes={completedProcesses} />
        <ProcessTable 
          processes={processes} 
          onRemoveProcess={handleRemoveProcess}
          onEditProcess={handleEditProcess}
          isSimulationRunning={isRunning}
        />
        <GanttChart ganttBlocks={visibleGanttBlocks} />
        <PerformanceMetrics metrics={metrics} />
      </div>
    </div>
  );
}

export default App;