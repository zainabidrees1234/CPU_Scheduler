import { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import type { Process } from '../types';

interface ProcessTableProps {
  processes: Process[];
  onRemoveProcess: (id: string) => void;
  onEditProcess: (id: string, updatedFields: { arrivalTime: number; burstTime: number; priority: number }) => void;
  isSimulationRunning: boolean;
  showPriorityColumn?: boolean;
}

export default function ProcessTable({ processes, onRemoveProcess, onEditProcess, isSimulationRunning, showPriorityColumn = true }: ProcessTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ arrivalTime: number; burstTime: number; priority: number } | null>(null);
  const [editError, setEditError] = useState<string>('');

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

  const handleEditClick = (process: Process) => {
    if (isSimulationRunning) return;
    setEditingId(process.id);
    setEditValues({
      arrivalTime: process.arrivalTime,
      burstTime: process.burstTime,
      priority: process.priority,
    });
    setEditError('');
  };

  const handleSave = (process: Process) => {
    if (!editValues) return;

    // Validate
    if (editValues.arrivalTime < 0) {
      setEditError('Arrival time cannot be negative');
      return;
    }
    if (editValues.burstTime <= 0) {
      setEditError('Burst time must be greater than 0');
      return;
    }
    if (editValues.priority < 1) {
      setEditError('Priority must be at least 1');
      return;
    }

    // Call parent callback
    onEditProcess(process.id, editValues);
    setEditingId(null);
    setEditValues(null);
    setEditError('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues(null);
    setEditError('');
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
                {showPriorityColumn && (
                  <th className="px-5 py-3 text-left font-medium">Priority</th>
                )}
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
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
                  {editingId === process.id && editValues ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editValues.arrivalTime}
                          onChange={e => setEditValues({ ...editValues, arrivalTime: parseInt(e.target.value) || 0 })}
                          className="input-field py-1 text-xs w-16"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={1}
                          value={editValues.burstTime}
                          onChange={e => setEditValues({ ...editValues, burstTime: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="input-field py-1 text-xs w-16"
                        />
                      </td>
                      {showPriorityColumn && (
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={1}
                            value={editValues.priority}
                            onChange={e => setEditValues({ ...editValues, priority: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="input-field py-1 text-xs w-16"
                          />
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-[#b0b0c0]">{process.arrivalTime}</td>
                      <td className="px-5 py-3 text-[#b0b0c0]">{process.burstTime}</td>
                      {showPriorityColumn && (
                        <td className="px-5 py-3 text-[#b0b0c0]">{process.priority}</td>
                      )}
                    </>
                  )}
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(process.status)}`}
                    >
                      {process.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right flex items-center justify-end gap-1.5">
                    {editingId === process.id ? (
                      <>
                        <button
                          onClick={() => handleSave(process)}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-all duration-200"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1.5 rounded-lg text-[#4a4a60] hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(process)}
                          disabled={isSimulationRunning}
                          className="p-1.5 rounded-lg text-[#4a4a60] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSimulationRunning ? 'Reset simulation to edit processes' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveProcess(process.id)}
                          disabled={isSimulationRunning}
                          className="p-1.5 rounded-lg text-[#4a4a60] hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSimulationRunning ? 'Reset simulation to delete processes' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editError && (
            <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
              {editError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
