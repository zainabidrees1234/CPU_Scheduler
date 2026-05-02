import { CheckCircle2 } from 'lucide-react';
import type { Process } from '../types';

interface CompletedProcessesProps {
  processes: Process[];
}

export default function CompletedProcesses({ processes }: CompletedProcessesProps) {
  const completed = processes.filter(p => p.status === 'Completed');

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Completed</h2>
        <span className="ml-auto text-[9px] text-[#3a3a55]">{completed.length}</span>
      </div>

      {completed.length === 0 ? (
        <div className="text-center py-2">
          <span className="text-[9px] text-[#2a2a40]">No completed processes</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {completed.map(process => (
            <span key={process.id} className="completed-badge">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {process.pid}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
