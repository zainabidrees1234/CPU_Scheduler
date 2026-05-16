import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RAMVisualization from './components/RAMVisualization';
import ReadyQueue from './components/ReadyQueue';
import CPUVisualization from './components/CPUVisualization';

import ProcessTable from './components/ProcessTable';
import GanttChart from './components/GanttChart';
import PerformanceMetrics from './components/PerformanceMetrics';
import { startSimulation } from './lib/simulation';
import type { Process, SchedulingAlgorithm, GanttBlock, PerformanceMetrics as Metrics } from './types';
import { PROCESS_COLORS, RAM_MAX_SLOTS } from './types';

let processCounter = 0;

const EMPTY_METRICS: Metrics = {
  avgWaitingTime: 0,
  avgTurnaroundTime: 0,
  cpuUtilization: 0,
  throughput: 0,
  avgResponseTime: 0,
  completionOrder: [],
};

function App() {
  // Refs to store data that doesn't require re-renders
  const fullScheduleRef = useRef<GanttBlock[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updatedProcessesRef = useRef<Process[]>([]);
  const finalMetricsRef = useRef<Metrics>(EMPTY_METRICS);

  const [processes, setProcesses] = useState<Process[]>([]);
  const [animProcesses, setAnimProcesses] = useState<Process[]>([]);
  const [rescheduleMessage, setRescheduleMessage] = useState('');
  const [largeBurstWarning, setLargeBurstWarning] = useState('');
  const [isSimulationComplete, setIsSimulationComplete] = useState(false);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>('fcfs');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [mlfqLevels, setMlfqLevels] = useState(3);
  const [mlfqQuantums, setMlfqQuantums] = useState<number[]>([2, 4]);
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [effectivePriorities, setEffectivePriorities] = useState<Record<string, number>>({});
  const [simulationResultProcesses, setSimulationResultProcesses] = useState<Process[]>([]);
  const [agingEnabled, setAgingEnabled] = useState(false);
  const [agingInterval, setAgingInterval] = useState(5);
  const [showAlgorithmChangeBanner, setShowAlgorithmChangeBanner] = useState(false);
  const prevAlgorithmRef = useRef<SchedulingAlgorithm>(algorithm);

  const [notifications, setNotifications] = useState<{ id: string; pid: string; color: string; }[]>([]);
  const prevCompletedRef = useRef<Set<string>>(new Set());

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
    if (newProcess.burstTime > 500) {
      setLargeBurstWarning('⚠️ Large burst time detected. Set speed to 10 for faster simulation.');
    }
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
    if (updatedFields.burstTime > 500) {
      setLargeBurstWarning('⚠️ Large burst time detected. Set speed to 10 for faster simulation.');
    }
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
    setEffectivePriorities(result.effectivePriorities ?? {});
    setSimulationResultProcesses(result.updatedProcesses);

    // Initialize animation state
    setSimulationTime(0);
    setIsRunning(true);
    setIsPaused(false);
    // Do not replace the canonical `processes` state with final results here.
    // Instead compute initial animation snapshot at time=0.
    setAnimProcesses(computeAnimationState(processes, result.ganttBlocks, 0));
    setMetrics(EMPTY_METRICS);
    setNotifications([]);
    prevCompletedRef.current.clear();
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
    setEffectivePriorities(result.effectivePriorities ?? {});
    setSimulationResultProcesses(result.updatedProcesses);
    // Reset animation state to restart from beginning
    setSimulationTime(0);
    setIsPaused(false); // Auto-resume
    // Do not overwrite canonical `processes`; compute initial animation snapshot
    setAnimProcesses(computeAnimationState(processes, result.ganttBlocks, 0));
    setMetrics(EMPTY_METRICS);
    setIsSimulationComplete(false);

    // show temporary banner
    setRescheduleMessage('Simulation restarted to include new process');
    setTimeout(() => setRescheduleMessage(''), 3000);
  }, [processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingEnabled, agingInterval]);

  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    processCounter = 0;
    fullScheduleRef.current = [];
    updatedProcessesRef.current = [];
    setMetrics(EMPTY_METRICS);
    setEffectivePriorities({});
    setSimulationResultProcesses([]);
    setProcesses([]);
    setAnimProcesses([]);
    setRescheduleMessage('');
    setLargeBurstWarning('');
    setIsSimulationComplete(false);
    setShowAlgorithmChangeBanner(false);
    setNotifications([]);
    prevCompletedRef.current.clear();
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
          setIsSimulationComplete(true);
          return prev;
        }

        // Only increment if not paused
        if (!isPaused) {
          const newTime = prev + 1;
          setAnimProcesses(computeAnimationState(processes, fullScheduleRef.current, newTime));

          // Live metrics: compute from updatedProcessesRef for processes completed so far
          try {
            const completedSoFar = updatedProcessesRef.current.filter(
              p => p.completionTime !== null && (p.completionTime as number) <= newTime
            );
            if (completedSoFar.length > 0) {
              // compute live metrics similar to simulation.computeMetrics
              const n = completedSoFar.length;
              const avgWaitingTime = parseFloat((completedSoFar.reduce((s, p) => s + p.waitingTime, 0) / n).toFixed(2));
              const avgTurnaroundTime = parseFloat((completedSoFar.reduce((s, p) => s + p.turnaroundTime, 0) / n).toFixed(2));
              const avgResponseTime = parseFloat((completedSoFar.reduce((s, p) => s + p.responseTime, 0) / n).toFixed(2));

              const busyTime = fullScheduleRef.current
                .filter(b => b.pid !== 'IDLE')
                .reduce((s, b) => {
                  const contrib = Math.max(0, Math.min(b.end, newTime) - b.start);
                  return s + contrib;
                }, 0);
              const cpuUtilization = parseFloat(((busyTime / Math.max(1, newTime)) * 100).toFixed(1));
              const throughput = parseFloat((completedSoFar.length / Math.max(1, newTime)).toFixed(3));

              setMetrics({
                avgWaitingTime,
                avgTurnaroundTime,
                cpuUtilization,
                throughput,
                avgResponseTime,
                completionOrder: completedSoFar.sort((a,b)=> (a.completionTime||0)-(b.completionTime||0)).map(p=>p.pid),
              });
            }
          } catch (e) {
            // swallow errors in live metric update
          }

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
  const visibleGanttBlocks = fullScheduleRef.current
    .filter(block => block.start <= simulationTime)
    .map(block => {
      if (block.end <= simulationTime) {
        return block;
      }
      // in-progress block: clamp end to current time and mark as in-progress
      return { ...block, end: simulationTime, inProgress: true } as any;
    });

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

  const showPriorityColumn = algorithm === 'priority-preemptive' || algorithm === 'priority-non-preemptive';

  // Trigger notifications for newly completed processes
  useEffect(() => {
    if (completedProcesses.length > 0) {
      const newCompleted = completedProcesses.filter(p => !prevCompletedRef.current.has(p.id));
      if (newCompleted.length > 0) {
        newCompleted.forEach(p => {
          prevCompletedRef.current.add(p.id);
          const notifId = Date.now() + '-' + p.id;
          setNotifications(prev => [...prev, { id: notifId, pid: p.pid, color: p.color }]);
          
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notifId));
          }, 3500); // Hide after 3.5 seconds
        });
      }
    }
  }, [completedProcesses]);

  // Compute display processes: when paused, merge new processes into animation snapshot
  const displayProcesses = isPaused && isRunning
    ? [
        ...animProcesses,
        ...processes.filter(p =>
          !animProcesses.some(a => a.id === p.id)
        ),
      ]
    : (isRunning || isSimulationComplete)
      ? animProcesses
      : processes;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] relative">
      {/* Notifications */}
      <div className="absolute top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className="glass-panel px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-[#2a2a45] transition-all duration-300 opacity-100"
            style={{ borderLeft: `4px solid ${n.color}` }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: n.color, boxShadow: `0 0 8px ${n.color}` }} />
            <span className="text-white text-sm font-semibold tracking-wide">Process {n.pid} Completed</span>
          </div>
        ))}
      </div>

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
        simulationResultProcesses={simulationResultProcesses}
        showAlgorithmChangeBanner={showAlgorithmChangeBanner}
        onDismissAlgorithmChangeBanner={() => setShowAlgorithmChangeBanner(false)}
      />

      {/* MIDDLE COLUMN — RAM + Ready Queue */}
      <div className="w-64 min-w-[256px] h-screen border-r border-[#1a1a30] flex flex-col p-3 gap-3">
        {/* RAM — takes remaining space, scrollable */}
        <div className="flex-1 min-h-0">
          <RAMVisualization processes={displayProcesses} />
        </div>

        {/* Flow indicator */}
        <div className="flex items-center justify-center gap-2 py-0.5 flex-shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
          <span className="text-[8px] text-[#2a2a45] uppercase tracking-widest">flow</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1a1a35] to-transparent" />
        </div>

        {/* Ready Queue — fixed at bottom */}
        <div className="flex-shrink-0">
          <ReadyQueue processes={displayProcesses} />
        </div>
      </div>

      {/* RIGHT COLUMN — CPU + Gantt + Metrics */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Completion banner near controls */}
        {isSimulationComplete && (
          <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-700 text-[12px] text-emerald-300">
            ✅ Simulation complete. Reset to run again or change algorithm.
          </div>
        )}

        <CPUVisualization currentProcess={currentProcess} isRunning={isRunning} />
        <ProcessTable 
          processes={processes} 
          onRemoveProcess={handleRemoveProcess}
          onEditProcess={handleEditProcess}
          isSimulationRunning={isRunning}
          showPriorityColumn={showPriorityColumn}
          effectivePriorities={effectivePriorities}
          showEffectivePriorityColumn={showPriorityColumn && agingEnabled}
        />
        {/* Reschedule message banner (temporary) */}
        {rescheduleMessage && (
          <div className="mt-2 p-2 rounded-md bg-yellow-400/10 border border-yellow-600 text-[12px] text-yellow-300">
            {rescheduleMessage}
          </div>
        )}

        {/* Large burst warning (dismissible) */}
        {largeBurstWarning && (
          <div className="mt-2 p-2 rounded-md bg-red-500/10 border border-red-600 text-[12px] text-red-400 flex items-center justify-between">
            <div>{largeBurstWarning}</div>
            <button onClick={() => setLargeBurstWarning('')} className="ml-3 text-sm text-red-300">Dismiss</button>
          </div>
        )}
        <GanttChart ganttBlocks={visibleGanttBlocks} currentTime={simulationTime} />
        <PerformanceMetrics metrics={metrics} />
      </div>
    </div>
  );
}

export default App;