import { MemoryStick } from 'lucide-react';
import type { Process, RAMSlot } from '../types';
import { RAM_MAX_SLOTS } from '../types';

interface RAMVisualizationProps {
  processes: Process[];
}

function getRAMSlots(processes: Process[]): RAMSlot[] {
  const inRAM = processes.filter(p => p.status === 'Ready' || p.status === 'Running' || p.status === 'Waiting');
  const slots: RAMSlot[] = [];
  for (let i = 0; i < RAM_MAX_SLOTS; i++) {
    slots.push({
      index: i,
      process: inRAM[i] || null,
    });
  }
  return slots;
}

export default function RAMVisualization({ processes }: RAMVisualizationProps) {
  const slots = getRAMSlots(processes);
  const occupiedCount = processes.filter(p => p.status === 'Ready' || p.status === 'Running' || p.status === 'Waiting').length;
  const isAtCapacity = occupiedCount >= RAM_MAX_SLOTS;

  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <MemoryStick className="w-4 h-4 text-[#00d4ff]" />
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">RAM</h2>
        <span className={`ml-auto text-[9px] font-semibold ${isAtCapacity ? 'text-red-400' : 'text-[#3a3a55]'}`}>
          {occupiedCount}/{RAM_MAX_SLOTS} slots
        </span>
      </div>

      {/* Capacity bar */}
      <div className="flex-shrink-0 mb-2">
        <div className="h-1 rounded-full bg-[#0a0a1a] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(occupiedCount / RAM_MAX_SLOTS) * 100}%`,
              background: isAtCapacity
                ? 'linear-gradient(90deg, #ff6b6b, #ef4444)'
                : 'linear-gradient(90deg, #00d4ff, #0099cc)',
            }}
          />
        </div>
      </div>

      {/* RAM Slots — always 10 slots, scrollable */}
      <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0 pr-1">
        {slots.map(slot => (
          <div
            key={slot.index}
            className={`ram-slot ${slot.process ? 'ram-slot-occupied' : 'ram-slot-empty'} flex items-center px-2 py-1.5`}
            style={slot.process ? {
              background: `${slot.process.color}08`,
              borderColor: `${slot.process.color}25`,
              boxShadow: `inset 0 0 12px ${slot.process.color}08`,
            } : undefined}
          >
            {slot.process ? (
              <div
                className="ram-process-card flex items-center gap-2 w-full"
                style={{
                  background: `${slot.process.color}15`,
                  border: `1px solid ${slot.process.color}30`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: slot.process.color, boxShadow: `0 0 6px ${slot.process.color}60` }}
                />
                <span className="font-bold text-[11px]" style={{ color: slot.process.color }}>
                  {slot.process.pid}
                </span>
                <span className="text-[9px] text-[#6a6a80]">
                  BT:{slot.process.remainingTime}
                </span>
                <span className="text-[9px] text-[#6a6a80]">
                  P:{slot.process.priority}
                </span>
              </div>
            ) : (
              <div className="w-full text-center text-[9px] text-[#1a1a35]">
                empty
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
