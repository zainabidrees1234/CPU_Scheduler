export type SchedulingAlgorithm =
  | 'fcfs'
  | 'sjf-non-preemptive'
  | 'sjf-preemptive'
  | 'priority-non-preemptive'
  | 'priority-preemptive'
  | 'round-robin'
  | 'mlfq';

export type ProcessStatus = 'Waiting' | 'Ready' | 'Running' | 'Completed';

export interface Process {
  id: string;
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  status: ProcessStatus;
  remainingTime: number;
  startTime: number | null;
  completionTime: number | null;
  waitingTime: number;
  turnaroundTime: number;
  responseTime: number;
  color: string;
  ramSlot: number | null;
}

export interface GanttBlock {
  pid: string;
  start: number;
  end: number;
  color: string;
}

export interface PerformanceMetrics {
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  cpuUtilization: number;
  throughput: number;
  avgResponseTime: number;
  completionOrder: string[];
}

export interface RAMSlot {
  index: number;
  process: Process | null;
}

export interface CPUState {
  isIdle: boolean;
  currentProcess: Process | null;
  progressPercent: number;
}

export const PROCESS_COLORS = [
  '#00d4ff', '#a855f7', '#ff6b6b', '#51cf66',
  '#ffd43b', '#ff922b', '#20c997', '#748ffc',
  '#f06595', '#66d9e8', '#c0eb75', '#e599f7',
];

export const RAM_INITIAL_SLOTS = 6;
export const RAM_MAX_SLOTS = 10;