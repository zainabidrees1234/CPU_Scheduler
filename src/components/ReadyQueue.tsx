import { ArrowRight } from 'lucide-react';
import type { Process } from '../types';

interface ReadyQueueProps {
  processes: Process[];
}

export default function ReadyQueue({ processes }: ReadyQueueProps) {
  const readyProcesses = processes.filter(p => p.status === 'Ready');

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Ready Queue</h2>
        <span className="ml-auto text-[9px] text-[#3a3a55]">
          {readyProcesses.length} waiting
        </span>
      </div>

      {readyProcesses.length === 0 ? (
        <div className="flex items-center justify-center h-10 border border-dashed border-[#1a1a35] rounded-lg">
          <span className="text-[10px] text-[#2a2a45]">Queue is empty</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {readyProcesses.map((process, index) => (
            <div key={process.id} className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="process-chip"
                style={{
                  background: `${process.color}15`,
                  border: `1px solid ${process.color}35`,
                  color: process.color,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: process.color }}
                />
                {process.pid}
              </div>
              {index < readyProcesses.length - 1 && (
                <ArrowRight className="w-3 h-3 flow-arrow flex-shrink-0" />
              )}
            </div>
          ))}
          <ArrowRight className="w-3 h-3 flow-arrow flex-shrink-0 ml-1" />
          <span className="text-[9px] text-[#3a3a55] flex-shrink-0">CPU</span>
        </div>
      )}
    </div>
  );
}
