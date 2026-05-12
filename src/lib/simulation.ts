import type {
  Process,
  SchedulingAlgorithm,
  GanttBlock,
  PerformanceMetrics,
} from '../types';

export interface SimulationResult {
  ganttBlocks: GanttBlock[];
  metrics: PerformanceMetrics;
  updatedProcesses: Process[];
}

// ─────────────────────────────────────────────
// HELPER: deep-clone processes so originals are untouched
// ─────────────────────────────────────────────
function cloneProcesses(processes: Process[]): Process[] {
  return processes.map(p => ({ ...p }));
}

// ─────────────────────────────────────────────
// HELPER: compute metrics from a completed process list + gantt
// ─────────────────────────────────────────────
function computeMetrics(
  procs: Process[],
  gantt: GanttBlock[],
  totalTime: number
): PerformanceMetrics {
  const n = procs.length;
  if (n === 0) {
    return {
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      avgResponseTime: 0,
      completionOrder: [],
    };
  }

  if (totalTime <= 0) {
    return {
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      avgResponseTime: 0,
      completionOrder: [],
    };
  }

  const avgWaitingTime = parseFloat(
    (procs.reduce((s, p) => s + p.waitingTime, 0) / n).toFixed(2)
  );
  const avgTurnaroundTime = parseFloat(
    (procs.reduce((s, p) => s + p.turnaroundTime, 0) / n).toFixed(2)
  );
  const avgResponseTime = parseFloat(
    (procs.reduce((s, p) => s + p.responseTime, 0) / n).toFixed(2)
  );

  // CPU busy time = sum of all gantt blocks that aren't IDLE
  const busyTime = gantt
    .filter(b => b.pid !== 'IDLE')
    .reduce((s, b) => s + (b.end - b.start), 0);
  const cpuUtilization = parseFloat(
    ((busyTime / totalTime) * 100).toFixed(1)
  );

  const throughput = parseFloat((n / totalTime).toFixed(3));

  // Completion order: sort by completionTime
  const completionOrder = [...procs]
    .sort((a, b) => (a.completionTime ?? 0) - (b.completionTime ?? 0))
    .map(p => p.pid);

  return {
    avgWaitingTime,
    avgTurnaroundTime,
    cpuUtilization,
    throughput,
    avgResponseTime,
    completionOrder,
  };
}

// ─────────────────────────────────────────────
// ALGORITHM 1: FCFS — First Come First Served
// ─────────────────────────────────────────────
function runFCFS(processes: Process[]): SimulationResult {
  const procs = cloneProcesses(processes);
  // Sort by arrival time, then by pid as tie-breaker
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));

  const gantt: GanttBlock[] = [];
  let currentTime = 0;

  for (const p of procs) {
    // CPU idles if next process hasn't arrived yet
    if (currentTime < p.arrivalTime) {
      gantt.push({ pid: 'IDLE', start: currentTime, end: p.arrivalTime, color: '#1a1a2e' });
      currentTime = p.arrivalTime;
    }

    p.startTime = currentTime;
    p.responseTime = currentTime - p.arrivalTime;
    p.waitingTime = currentTime - p.arrivalTime;

    gantt.push({ pid: p.pid, start: currentTime, end: currentTime + p.burstTime, color: p.color });
    currentTime += p.burstTime;

    p.completionTime = currentTime;
    p.turnaroundTime = p.completionTime - p.arrivalTime;
    p.remainingTime = 0;
    p.status = 'Completed';
  }

  const metrics = computeMetrics(procs, gantt, currentTime);
  return { ganttBlocks: gantt, metrics, updatedProcesses: procs };
}

// ─────────────────────────────────────────────
// ALGORITHM 2 & 3: SJF — Non-Preemptive & Preemptive (SRTF)
// ─────────────────────────────────────────────
function runSJF(processes: Process[], preemptive: boolean): SimulationResult {
  const procs = cloneProcesses(processes);
  procs.forEach(p => { p.remainingTime = p.burstTime; });

  const gantt: GanttBlock[] = [];
  let currentTime = 0;
  let completed = 0;
  const n = procs.length;

  while (completed < n) {
    // Available processes: arrived and not completed
    const available = procs.filter(
      p => p.arrivalTime <= currentTime && p.remainingTime > 0
    );

    if (available.length === 0) {
      // Find next arrival
      const next = procs
        .filter(p => p.remainingTime > 0)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      if (!next) break;
      gantt.push({ pid: 'IDLE', start: currentTime, end: next.arrivalTime, color: '#1a1a2e' });
      currentTime = next.arrivalTime;
      continue;
    }

    // Pick shortest remaining time
    available.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime);
    const current = available[0];

    if (current.startTime === null) {
      current.startTime = currentTime;
      current.responseTime = currentTime - current.arrivalTime;
    }

    if (!preemptive) {
      // Run to completion
      const start = currentTime;
      currentTime += current.remainingTime;
      gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
      current.remainingTime = 0;
      current.completionTime = currentTime;
      current.turnaroundTime = current.completionTime - current.arrivalTime;
      current.waitingTime = current.turnaroundTime - current.burstTime;
      current.status = 'Completed';
      completed++;
    } else {
      // SRTF: run for 1 unit at a time, check for preemption
      const start = currentTime;
      currentTime += 1;
      current.remainingTime -= 1;

      // Merge with last gantt block if same process
      if (gantt.length > 0 && gantt[gantt.length - 1].pid === current.pid) {
        gantt[gantt.length - 1].end = currentTime;
      } else {
        gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
      }

      if (current.remainingTime === 0) {
        current.completionTime = currentTime;
        current.turnaroundTime = current.completionTime - current.arrivalTime;
        current.waitingTime = current.turnaroundTime - current.burstTime;
        current.status = 'Completed';
        completed++;
      }
    }
  }

  const metrics = computeMetrics(procs, gantt, currentTime);
  return { ganttBlocks: gantt, metrics, updatedProcesses: procs };
}

// ─────────────────────────────────────────────
// ALGORITHM 4 & 5: Priority — Non-Preemptive & Preemptive
// Lower number = higher priority
// ─────────────────────────────────────────────
function runPriority(processes: Process[], preemptive: boolean, agingInterval: number = 0): SimulationResult {
  const procs = cloneProcesses(processes);
  procs.forEach(p => { p.remainingTime = p.burstTime; });

  // Track effective priorities separately so we don't mutate original objects
  const effectivePriority = new Map<string, number>();
  procs.forEach(p => { effectivePriority.set(p.id, p.priority); });

  // Aging counters accumulate time while a process is waiting
  const agingCounter = new Map<string, number>();
  procs.forEach(p => { agingCounter.set(p.id, 0); });

  const gantt: GanttBlock[] = [];
  let currentTime = 0;
  let completed = 0;
  const n = procs.length;

  while (completed < n) {
    const available = procs.filter(
      p => p.arrivalTime <= currentTime && p.remainingTime > 0
    );

    if (available.length === 0) {
      const next = procs
        .filter(p => p.remainingTime > 0)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      if (!next) break;
      gantt.push({ pid: 'IDLE', start: currentTime, end: next.arrivalTime, color: '#1a1a2e' });
      currentTime = next.arrivalTime;
      continue;
    }

    // Pick highest priority (lowest number) using effective priorities, break ties by arrival time
    available.sort((a, b) => {
      const aPrio = effectivePriority.get(a.id) || a.priority;
      const bPrio = effectivePriority.get(b.id) || b.priority;
      return aPrio - bPrio || a.arrivalTime - b.arrivalTime;
    });
    const current = available[0];

    if (current.startTime === null) {
      current.startTime = currentTime;
      current.responseTime = currentTime - current.arrivalTime;
    }

    if (!preemptive) {
      if (agingInterval > 0) {
        agingCounter.set(current.id, 0);
        const duration = current.remainingTime;

        for (let t = 0; t < duration; t++) {
          procs.forEach(p => {
            if (
              p.arrivalTime <= currentTime + t &&
              p.remainingTime > 0 &&
              p.id !== current.id
            ) {
              const cnt = (agingCounter.get(p.id) || 0) + 1;
              if (cnt >= agingInterval) {
                const cur = effectivePriority.get(p.id) || p.priority;
                effectivePriority.set(p.id, Math.max(1, cur - 1));
                agingCounter.set(p.id, 0);
              } else {
                agingCounter.set(p.id, cnt);
              }
            }
          });
        }
      }

      const start = currentTime;
      currentTime += current.remainingTime;
      gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
      current.remainingTime = 0;
      current.completionTime = currentTime;
      current.turnaroundTime = current.completionTime - current.arrivalTime;
      current.waitingTime = current.turnaroundTime - current.burstTime;
      current.status = 'Completed';
      completed++;
    } else {
      // Preserve the existing preemptive aging behavior: one scheduler tick equals one time unit.
      if (agingInterval > 0) {
        agingCounter.set(current.id, 0);
        procs.forEach(p => {
          if (
            p.arrivalTime <= currentTime &&
            p.remainingTime > 0 &&
            p.id !== current.id
          ) {
            const cnt = (agingCounter.get(p.id) || 0) + 1;
            if (cnt >= agingInterval) {
              const cur = effectivePriority.get(p.id) || p.priority;
              effectivePriority.set(p.id, Math.max(1, cur - 1));
              agingCounter.set(p.id, 0);
            } else {
              agingCounter.set(p.id, cnt);
            }
          }
        });
      }

      const start = currentTime;
      currentTime += 1;
      current.remainingTime -= 1;

      if (gantt.length > 0 && gantt[gantt.length - 1].pid === current.pid) {
        gantt[gantt.length - 1].end = currentTime;
      } else {
        gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
      }

      if (current.remainingTime === 0) {
        current.completionTime = currentTime;
        current.turnaroundTime = current.completionTime - current.arrivalTime;
        current.waitingTime = current.turnaroundTime - current.burstTime;
        current.status = 'Completed';
        completed++;
      }
    }
  }

  const metrics = computeMetrics(procs, gantt, currentTime);
  return { ganttBlocks: gantt, metrics, updatedProcesses: procs };
}

// ─────────────────────────────────────────────
// ALGORITHM 6: Round Robin
// ─────────────────────────────────────────────
function runRoundRobin(processes: Process[], quantum: number): SimulationResult {
  const procs = cloneProcesses(processes);
  procs.forEach(p => { p.remainingTime = p.burstTime; });
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

  const gantt: GanttBlock[] = [];
  let currentTime = 0;
  let completed = 0;
  const n = procs.length;
  const queue: Process[] = [];
  const enqueued = new Set<string>();

  // Enqueue processes that arrive at time 0
  procs
    .filter(p => p.arrivalTime <= currentTime)
    .forEach(p => { queue.push(p); enqueued.add(p.id); });

  while (completed < n) {
    if (queue.length === 0) {
      // Find next arriving process
      const next = procs
        .filter(p => !enqueued.has(p.id) && p.remainingTime > 0)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      if (!next) break;
      gantt.push({ pid: 'IDLE', start: currentTime, end: next.arrivalTime, color: '#1a1a2e' });
      currentTime = next.arrivalTime;
      procs
        .filter(p => p.arrivalTime <= currentTime && !enqueued.has(p.id))
        .forEach(p => { queue.push(p); enqueued.add(p.id); });
      continue;
    }

    const current = queue.shift()!;
    if (current.remainingTime <= 0) continue;

    if (current.startTime === null) {
      current.startTime = currentTime;
      current.responseTime = currentTime - current.arrivalTime;
    }

    const runTime = Math.min(quantum, current.remainingTime);
    const start = currentTime;
    currentTime += runTime;
    current.remainingTime -= runTime;

    // Merge gantt blocks for same process
    if (gantt.length > 0 && gantt[gantt.length - 1].pid === current.pid) {
      gantt[gantt.length - 1].end = currentTime;
    } else {
      gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
    }

    if (current.remainingTime === 0) {
      current.completionTime = currentTime;
      current.turnaroundTime = current.completionTime - current.arrivalTime;
      current.waitingTime = current.turnaroundTime - current.burstTime;
      current.status = 'Completed';
      completed++;
    } else {
      // Re-enqueue at end of queue
      queue.push(current);
    }

    // Enqueue newly arrived processes
    procs
      .filter(p => p.arrivalTime <= currentTime && !enqueued.has(p.id) && p.remainingTime > 0)
      .forEach(p => { queue.push(p); enqueued.add(p.id); });
  }

  const metrics = computeMetrics(procs, gantt, currentTime);
  return { ganttBlocks: gantt, metrics, updatedProcesses: procs };
}

// ─────────────────────────────────────────────
// ALGORITHM 7: MLFQ — Multilevel Feedback Queue
// 3 queues: Q0 (RR q=2), Q1 (RR q=4), Q2 (FCFS)
// Process demoted after using full quantum without completing
// ─────────────────────────────────────────────
function runMLFQ(processes: Process[], numQueues: number = 3, quantumsInput: number[] = [2, 4]): SimulationResult {
  const procs = cloneProcesses(processes);
  procs.forEach(p => { p.remainingTime = p.burstTime; });
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

  // Validate and build quantums array
  // numQueues: 2, 3, or 4
  // quantumsInput should have numQueues-1 entries (last always Infinity)
  let validNumQueues = Math.max(2, Math.min(4, numQueues));
  let QUANTUMS: number[] = [];
  
  // Fill quantums: use input for first (validNumQueues-1), pad if needed, last is Infinity
  for (let i = 0; i < validNumQueues; i++) {
    if (i < quantumsInput.length) {
      QUANTUMS.push(quantumsInput[i]);
    } else if (i === validNumQueues - 1) {
      // Last queue is always Infinity (FCFS)
      QUANTUMS.push(Infinity);
    } else {
      // Pad with doubled last value
      const lastVal = QUANTUMS[QUANTUMS.length - 1];
      QUANTUMS.push(lastVal * 2);
    }
  }
  // Force last to be Infinity
  QUANTUMS[QUANTUMS.length - 1] = Infinity;

  // Create queues array with correct length
  const queues: Process[][] = Array.from({ length: validNumQueues }, () => []);
  const processQueue: Map<string, number> = new Map(); // which queue level each process is in
  const quantumUsed: Map<string, number> = new Map(); // ticks used in the current queue tenure
  const enqueued = new Set<string>();

  const gantt: GanttBlock[] = [];
  let currentTime = 0;
  let completed = 0;
  const n = procs.length;

  function enqueueArrivals(time: number) {
    procs
      .filter(p => p.arrivalTime <= time && !enqueued.has(p.id) && p.remainingTime > 0)
      .forEach(p => {
        queues[0].push(p);
        processQueue.set(p.id, 0);
        enqueued.add(p.id);
      });
  }

  enqueueArrivals(currentTime);

  while (completed < n) {
    // Pick from highest non-empty queue
    let selectedQueue = -1;
    for (let q = 0; q < validNumQueues; q++) {
      if (queues[q].length > 0) { selectedQueue = q; break; }
    }

    if (selectedQueue === -1) {
      // No process ready — advance to next arrival
      const next = procs
        .filter(p => !enqueued.has(p.id) && p.remainingTime > 0)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
      if (!next) break;
      gantt.push({ pid: 'IDLE', start: currentTime, end: next.arrivalTime, color: '#1a1a2e' });
      currentTime = next.arrivalTime;
      enqueueArrivals(currentTime);
      continue;
    }

    const current = queues[selectedQueue].shift()!;
    if (current.remainingTime <= 0) continue;

    if (current.startTime === null) {
      current.startTime = currentTime;
      current.responseTime = currentTime - current.arrivalTime;
    }

    const quantum = QUANTUMS[selectedQueue];
    const startQuantumUsed = quantumUsed.get(current.id) || 0;

    if (selectedQueue === 0) {
      const runTime = Math.min(quantum, current.remainingTime);
      const start = currentTime;
      currentTime += runTime;
      current.remainingTime -= runTime;

      if (gantt.length > 0 && gantt[gantt.length - 1].pid === current.pid) {
        gantt[gantt.length - 1].end = currentTime;
      } else {
        gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
      }

      enqueueArrivals(currentTime);

      if (current.remainingTime === 0) {
        current.completionTime = currentTime;
        current.turnaroundTime = current.completionTime - current.arrivalTime;
        current.waitingTime = current.turnaroundTime - current.burstTime;
        current.status = 'Completed';
        completed++;
        quantumUsed.delete(current.id);
      } else {
        // Demote to next queue if not already in lowest
        const nextQueue = Math.min(selectedQueue + 1, validNumQueues - 1);
        processQueue.set(current.id, nextQueue);
        quantumUsed.delete(current.id);
        queues[nextQueue].push(current);
      }
    } else {
      let preemptedByQ0 = false;
      let used = startQuantumUsed;

      while (current.remainingTime > 0 && used < quantum) {
        const start = currentTime;
        currentTime += 1;
        current.remainingTime -= 1;
        used += 1;
        quantumUsed.set(current.id, used);

        if (gantt.length > 0 && gantt[gantt.length - 1].pid === current.pid) {
          gantt[gantt.length - 1].end = currentTime;
        } else {
          gantt.push({ pid: current.pid, start, end: currentTime, color: current.color });
        }

        enqueueArrivals(currentTime);

        if (current.remainingTime === 0) {
          current.completionTime = currentTime;
          current.turnaroundTime = current.completionTime - current.arrivalTime;
          current.waitingTime = current.turnaroundTime - current.burstTime;
          current.status = 'Completed';
          completed++;
          quantumUsed.delete(current.id);
          break;
        }

        if (queues[0].length > 0) {
          preemptedByQ0 = true;
          break;
        }
      }

      if (current.remainingTime > 0 && !preemptedByQ0) {
        if (used >= quantum) {
          // Demote to next queue if not already in lowest
          const nextQueue = Math.min(selectedQueue + 1, validNumQueues - 1);
          processQueue.set(current.id, nextQueue);
          quantumUsed.delete(current.id);
          queues[nextQueue].push(current);
        }
      } else if (preemptedByQ0) {
        processQueue.set(current.id, selectedQueue);
        queues[selectedQueue].push(current);
      }
    }
  }

  const metrics = computeMetrics(procs, gantt, currentTime);
  return { ganttBlocks: gantt, metrics, updatedProcesses: procs };
}

// ─────────────────────────────────────────────
// MAIN ENTRY: startSimulation
// ─────────────────────────────────────────────
export function startSimulation(
  processes: Process[],
  algorithm: SchedulingAlgorithm,
  timeQuantum: number = 2,
  mlfqLevels: number = 3,
  mlfqQuantums: number[] = [2, 4],
  agingInterval: number = 0
): SimulationResult {
  if (processes.length === 0) {
    return {
      ganttBlocks: [],
      metrics: {
        avgWaitingTime: 0,
        avgTurnaroundTime: 0,
        cpuUtilization: 0,
        throughput: 0,
        avgResponseTime: 0,
        completionOrder: [],
      },
      updatedProcesses: [],
    };
  }

  switch (algorithm) {
    case 'fcfs':
      return runFCFS(processes);
    case 'sjf-non-preemptive':
      return runSJF(processes, false);
    case 'sjf-preemptive':
      return runSJF(processes, true);
    case 'priority-non-preemptive':
      return runPriority(processes, false, agingInterval);
    case 'priority-preemptive':
      return runPriority(processes, true, agingInterval);
    case 'round-robin':
      return runRoundRobin(processes, timeQuantum);
    case 'mlfq':
      return runMLFQ(processes, mlfqLevels, mlfqQuantums);
    default:
      return runFCFS(processes);
  }
}

// ─────────────────────────────────────────────
// ADAPTIVE FEEDBACK ENGINE
// Analyzes current state and recommends a better algorithm
// ─────────────────────────────────────────────
export function adaptiveFeedback(
  algorithm: SchedulingAlgorithm,
  processes: Process[],
  metrics: PerformanceMetrics
): string {
  if (processes.length === 0) {
    return 'Add processes to begin simulation. Adaptive recommendations will appear here.';
  }

  const { avgWaitingTime, avgTurnaroundTime, cpuUtilization, completionOrder } = metrics;

  // Check for starvation: any process waiting much longer than average
  const readyProcesses = processes.filter(p => p.status === 'Ready' || p.status === 'Waiting');
  const hasStarvation = readyProcesses.some(p => p.waitingTime > avgWaitingTime * 2.5);

  // Detect high variance in burst times
  const burstTimes = processes.map(p => p.burstTime);
  const avgBurst = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;
  const burstVariance = burstTimes.reduce((s, b) => s + Math.pow(b - avgBurst, 2), 0) / burstTimes.length;
  const highVariance = Math.sqrt(burstVariance) > avgBurst * 0.5;

  // All processes arrive at same time
  const allSameArrival = processes.every(p => p.arrivalTime === processes[0].arrivalTime);

  // High priority spread
  const priorities = processes.map(p => p.priority);
  const prioritySpread = Math.max(...priorities) - Math.min(...priorities);
  const highPrioritySpread = prioritySpread > 3;

  // Low CPU utilization
  const lowUtilization = cpuUtilization > 0 && cpuUtilization < 70;

  // Many processes (interactive workload)
  const manyProcesses = processes.length >= 5;

  // Now give smart recommendations
  if (hasStarvation && algorithm === 'priority-non-preemptive') {
    return '⚠️ Starvation detected! Low-priority processes are starving. Switch to Priority Preemptive with aging, or use Round Robin for fairness.';
  }

  if (hasStarvation && algorithm === 'sjf-non-preemptive') {
    return '⚠️ Long processes may be starving. SJF can cause starvation for large burst times. Consider MLFQ which demotes long jobs gracefully.';
  }

  if (highVariance && algorithm === 'fcfs') {
    return '💡 Burst times vary significantly. FCFS causes convoy effect here. SJF or SRTF would reduce average waiting time considerably.';
  }

  if (manyProcesses && algorithm === 'fcfs') {
    return '💡 With many processes, FCFS is unfair to short jobs. Round Robin ensures every process gets CPU time — ideal for interactive systems.';
  }

  if (highPrioritySpread && algorithm !== 'priority-preemptive' && algorithm !== 'priority-non-preemptive') {
    return '💡 Processes have distinct priority levels. Priority Scheduling would leverage this to improve response time for critical processes.';
  }

  if (allSameArrival && algorithm === 'round-robin') {
    return '💡 All processes arrive simultaneously. SJF Non-Preemptive would minimize average waiting time better than Round Robin here.';
  }

  if (manyProcesses && algorithm === 'round-robin') {
    return '✅ Round Robin is a solid choice for this workload. Consider MLFQ if processes have mixed CPU and I/O behavior for even better throughput.';
  }

  if (algorithm === 'mlfq') {
    return '✅ MLFQ is optimal for mixed workloads. Short jobs finish quickly in Q0, long jobs degrade gracefully. Good choice!';
  }

  if (lowUtilization) {
    return '⚠️ CPU utilization is low. Check arrival times — there may be gaps. Consider adjusting process arrival times for better throughput.';
  }

  if (avgWaitingTime > avgTurnaroundTime * 0.6) {
    return '⚠️ High waiting time relative to turnaround. Try SJF Preemptive (SRTF) to minimize waiting time for short processes.';
  }

  if (completionOrder.length > 0 && algorithm === 'fcfs') {
    return '✅ FCFS is simple and fair for uniform workloads. If burst times differ greatly, SJF will outperform FCFS on average waiting time.';
  }

  return '✅ Current algorithm is performing well for this workload. Try different algorithms to compare performance metrics.';
}