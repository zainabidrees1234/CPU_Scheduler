import { Trash2 } from 'lucide-react';
import type { Process } from '../types';

interface ProcessTableProps {
  processes: Process[];
  onRemoveProcess: (id: string) => void;
}

export default function ProcessTable({ processes, onRemoveProcess }: ProcessTableProps) {
  const statusClass = (status: Process['status']) => {
    switch (status) {
      case 'Waiting':
        return 'status-waiting';
      case 'Running':
        return 'status-running';
      case 'Completed':
        return 'status-completed';
    }
  };

  return (
    <div className="panel panel-glow overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e30] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Process Table</h2>
        <span className="text-xs text-[#4a4a60]">{processes.length} process{processes.length !== 1 ? 'es' : ''}</span>
      </div>

      {processes.length === 0 ? (
        <div className="px-5 py-10 text-center text-[#4a4a60] text-sm">
          No processes added yet. Use the sidebar to add processes.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#6a6a80] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">PID</th>
                <th className="px-5 py-3 text-left font-medium">Arrival Time</th>
                <th className="px-5 py-3 text-left font-medium">Burst Time</th>
                <th className="px-5 py-3 text-left font-medium">Priority</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((process) => (
                <tr
                  key={process.id}
                  className="border-t border-[#1e1e30] hover:bg-[#16162a] transition-colors duration-150"
                >
                  <td className="px-5 py-3">
                    <span className="font-medium text-[#00d4ff]">{process.pid}</span>
                  </td>
                  <td className="px-5 py-3 text-[#b0b0c0]">{process.arrivalTime}</td>
                  <td className="px-5 py-3 text-[#b0b0c0]">{process.burstTime}</td>
                  <td className="px-5 py-3 text-[#b0b0c0]">{process.priority}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(process.status)}`}
                    >
                      {process.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => onRemoveProcess(process.id)}
                      className="p-1.5 rounded-lg text-[#4a4a60] hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
