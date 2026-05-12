import type { GanttBlock } from '../types';

interface GanttChartProps {
  ganttBlocks: GanttBlock[];
}

export default function GanttChart({ ganttBlocks }: GanttChartProps) {
  const totalTime = ganttBlocks.length > 0
    ? ganttBlocks[ganttBlocks.length - 1].end - ganttBlocks[0].start
    : 1;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Gantt Chart</h2>
        {ganttBlocks.length > 0 && (
          <span className="ml-auto text-[9px] text-[#3a3a55]">
            Total: {ganttBlocks[ganttBlocks.length - 1].end} units
          </span>
        )}
      </div>

      {ganttBlocks.length === 0 ? (
        <div className="flex items-center justify-center h-16 border border-dashed border-[#1a1a35] rounded-lg">
          <p className="text-[10px] text-[#2a2a40]">Gantt Chart will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Blocks */}
          <div className="overflow-x-auto">
            <div className="flex rounded-lg h-12" style={{ minWidth: 'max-content' }}>
              {ganttBlocks.map((block, index) => {
                const width = ((block.end - block.start) / totalTime) * 100;
                const isIdle = block.pid === 'IDLE';
                return (
                  <div
                    key={index}
                    className={`gantt-block flex flex-col items-center justify-center text-[10px] font-semibold border-r last:border-r-0 ${isIdle ? 'border-dashed' : ''}`}
                    style={{
                      width: `${Math.max(width, 2)}%`,
                      backgroundColor: isIdle ? '#333' : block.color,
                      color: isIdle ? '#cfcfcf' : '#0a0a1a',
                      minWidth: width > 2 ? undefined : '48px',
                      backgroundImage: isIdle ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px)' : undefined,
                      borderColor: isIdle ? '#4a4a4a' : undefined,
                    }}
                  >
                    <span className="font-bold">{isIdle ? 'IDLE' : block.pid}</span>
                    <span className="opacity-60 text-[8px]">{block.start}-{block.end}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time markers */}
          <div className="flex text-[8px] text-[#3a3a55]">
            {ganttBlocks.map((block, index) => (
              <div
                key={index}
                className="flex justify-between"
                style={{
                  width: `${Math.max(((block.end - block.start) / totalTime) * 100, 2)}%`,
                  minWidth: '32px',
                }}
              >
                <span>{block.start}</span>
                {index === ganttBlocks.length - 1 && <span>{block.end}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
