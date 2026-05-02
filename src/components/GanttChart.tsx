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
          <div className="flex rounded-lg overflow-hidden h-12">
            {ganttBlocks.map((block, index) => {
              const width = ((block.end - block.start) / totalTime) * 100;
              return (
                <div
                  key={index}
                  className="gantt-block flex flex-col items-center justify-center text-[10px] font-semibold border-r border-[#0a0a1a] last:border-r-0"
                  style={{
                    width: `${Math.max(width, 2)}%`,
                    backgroundColor: block.color,
                    color: '#0a0a1a',
                    minWidth: width > 2 ? undefined : '32px',
                  }}
                >
                  <span className="font-bold">{block.pid}</span>
                  <span className="opacity-60 text-[8px]">{block.start}-{block.end}</span>
                </div>
              );
            })}
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
