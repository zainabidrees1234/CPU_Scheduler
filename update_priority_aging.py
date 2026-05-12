import re

# Read the file
with open(r'src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update 1: Modify runPriority signature
old_sig = r"function runPriority\(processes: Process\[\], preemptive: boolean\): SimulationResult \{"
new_sig = "function runPriority(processes: Process[], preemptive: boolean, agingInterval: number = 0): SimulationResult {"
content = re.sub(old_sig, new_sig, content)

# Update 2: Add aging tracking after cloneProcesses
old_init = r"(const procs = cloneProcesses\(processes\);\s+procs\.forEach\(p => \{ p\.remainingTime = p\.burstTime; \}\);)"
new_init = r"""\1

  // Track effective priorities (separate from original)
  const effectivePriority = new Map<string, number>();
  procs.forEach(p => {
    effectivePriority.set(p.id, p.priority);
  });

  // Track aging: how many time units accumulated since last priority boost
  const agingCounter = new Map<string, number>();
  procs.forEach(p => {
    agingCounter.set(p.id, 0);
  });"""

content = re.sub(old_init, new_init, content, count=1)

# Update 3: Update priority sorting to use effective priorities
old_sort = r"available\.sort\(\(a, b\) => a\.priority - b\.priority \|\| a\.arrivalTime - b\.arrivalTime\);"
new_sort = r"""available.sort((a, b) => {
      const aPrio = effectivePriority.get(a.id) || a.priority;
      const bPrio = effectivePriority.get(b.id) || b.priority;
      return aPrio - bPrio || a.arrivalTime - b.arrivalTime;
    });"""

content = re.sub(old_sort, new_sort, content, count=1)

# Update 4: Update startSimulation signature to accept agingInterval
old_start_sig = r"(export function startSimulation\(\s+processes: Process\[\],\s+algorithm: SchedulingAlgorithm,\s+timeQuantum: number = 2,\s+mlfqLevels: number = 3,\s+mlfqQuantums: number\[\] = \[2, 4\]\s+\):)"
new_start_sig = r"""export function startSimulation(
  processes: Process[],
  algorithm: SchedulingAlgorithm,
  timeQuantum: number = 2,
  mlfqLevels: number = 3,
  mlfqQuantums: number[] = [2, 4],
  agingInterval: number = 0
):"""

content = re.sub(old_start_sig, new_start_sig, content, flags=re.MULTILINE | re.DOTALL)

# Update 5: Pass agingInterval to runPriority calls
old_priority_calls = r"return runPriority\(processes, (false|true)\);"
new_priority_calls = r"return runPriority(processes, \1, agingInterval);"

content = re.sub(old_priority_calls, new_priority_calls, content)

# Write the file back
with open(r'src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated simulation.ts successfully!")
