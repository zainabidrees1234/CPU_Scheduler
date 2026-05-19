# Interactive CPU Scheduling Simulator

Interactive CPU Scheduling Simulator

Overview

An interactive, client-side simulator for experimenting with CPU scheduling algorithms. Built with React, TypeScript and Vite, the simulator computes a full scheduling timeline from a set of user-provided processes and animates the schedule with a Gantt chart, ready queue visualization and live performance metrics.

Key features
- Implemented scheduling algorithms: FCFS, SJF (preemptive & non-preemptive), Priority (preemptive & non-preemptive with optional aging), Round Robin, and MLFQ.
- Full schedule computation plus an animation engine that steps through time and produces live metrics (avg waiting time, turnaround, response time, CPU utilization, throughput).
- Interactive UI to add/edit/remove processes, configure algorithm parameters (time quantum, MLFQ levels/quantums, aging), and control simulation (start/pause/resume/reset/reschedule).
- Visual components: Gantt chart, CPU visualization, Ready queue, RAM slots, Process table, and Performance metrics.

Quickstart (development)

1. Install dependencies

```bash
npm install
```

2. Run development server (hot reload)

```bash
npm run dev
```

3. Build production bundle

```bash
npm run build
```

4. Preview production build locally

```bash
npm run preview
```

The production output is written to the `dist/` folder.

How to use the app (UI guide)
- Add processes in the left `Sidebar`: set arrival time, burst time, and (for priority algorithms) priority.
- Choose an algorithm from the `Algorithm` dropdown. If you select `Round Robin`, set the time quantum. If you select `MLFQ`, configure queue levels and quantums and optionally the last queue (FCFS) behavior.
- Enable priority aging for priority algorithms to prevent starvation and configure the aging interval.
- Start the simulation with `Start`. Use `Pause` / `Resume`, `Reset`, or `Re-schedule` (recompute schedule when adding processes mid-run).
- Visual outputs:
	- Gantt chart: shows CPU allocation timeline and IDLE periods.
	- CPU visualization: current running process and progress.
	- Ready queue: processes waiting for CPU.
	- Process table: editable list of processes (editing disabled during a run).
	- Performance metrics: average waiting/turnaround/response time, CPU utilization, throughput, and completion order.

Implementation notes (for contributors)
- Core simulation logic lives in `src/lib/simulation.ts`. The main entry is `startSimulation(processes, algorithm, timeQuantum, mlfqLevels, mlfqQuantums, agingInterval)` which returns:
	- `ganttBlocks`: an array of time blocks used to draw the Gantt chart
	- `metrics`: computed performance metrics
	- `updatedProcesses`: the process list with computed start/completion/wait times
	- `effectivePriorities` (when applicable): computed priority values after aging
- UI and animation are implemented in `src/App.tsx`. The app precomputes the full schedule with `startSimulation` and then animates time by stepping a clock and deriving a live snapshot for display.

Files and structure (high level)
- `src/lib/simulation.ts` — scheduling algorithms and helpers (FCFS, SJF, Priority, Round Robin, MLFQ, adaptive feedback)
- `src/App.tsx` — application state and animation loop
- `src/main.tsx` — app bootstrap
- `src/types.ts` — shared types (`Process`, `GanttBlock`, `PerformanceMetrics`, etc.)
- `src/components/` — UI components including `GanttChart.tsx`, `ProcessTable.tsx`, `Sidebar.tsx`, `CPUVisualization.tsx`, `ReadyQueue.tsx`, `PerformanceMetrics.tsx`, `RAMVisualization.tsx`, `CompletedProcesses.tsx`.
- `update_priority_aging.py` — small utility script used for priority/aging experiments (Python).

Extending or modifying algorithms
- To add or change an algorithm, edit `src/lib/simulation.ts`:
	1. Implement a function that takes a cloned list of `Process` objects and returns a `SimulationResult` (gantt blocks, metrics, updated processes).
	2. Add a case to the `startSimulation` switch to call your function for the appropriate algorithm identifier.
	3. Update `src/types.ts` if you introduce new types or algorithm identifiers.

Tips & behavior details
- The simulator clones input processes before running algorithms so the original UI state stays intact.
- MLFQ: the last queue is treated as FCFS (infinite quantum). You can configure the number of queues (2–4) and quantums for the higher-priority queues.
- Priority aging: when enabled, the scheduler periodically boosts waiting processes by reducing their effective priority value (lower number = higher priority).
- Adaptive feedback: `adaptiveFeedback` in `src/lib/simulation.ts` analyzes the completed run and offers recommendations (e.g., use RR or MLFQ to avoid starvation).

Contributing
- Open an issue describing the feature or bug.
- Fork, create a feature branch, and submit a pull request with clear description and screenshots if relevant.

License
- No license file is included in the repository. Add a `LICENSE` file if you want to apply an open-source license.

Questions or changes
- If you'd like, I can add example scenarios, a recorded demo GIF, or expand the developer guide with unit tests and CI setup. Tell me which you'd prefer next.
