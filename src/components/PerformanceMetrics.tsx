import { Clock, Timer, Cpu, Activity, Zap, ListOrdered } from 'lucide-react';
import type { PerformanceMetrics as Metrics } from '../types';

interface PerformanceMetricsProps {
  metrics: Metrics;
}

export default function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const fmt = (v: number | string | null | undefined) =>
    v !== null && v !== undefined && v !== '' ? v : '\u2014';

  const cards = [
    {
      label: 'Avg Waiting Time',
      value: fmt(metrics.avgWaitingTime),
      unit: 'units',
      icon: Clock,
      color: '#ffd43b',
    },
    {
      label: 'Avg Turnaround Time',
      value: fmt(metrics.avgTurnaroundTime),
      unit: 'units',
      icon: Timer,
      color: '#ff6b6b',
    },
    {
      label: 'CPU Utilization',
      value: fmt(metrics.cpuUtilization),
      unit: '%',
      icon: Cpu,
      color: '#00d4ff',
    },
    {
      label: 'Throughput',
      value: fmt(metrics.throughput),
      unit: 'proc/unit',
      icon: Activity,
      color: '#51cf66',
    },
    {
      label: 'Avg Response Time',
      value: fmt(metrics.avgResponseTime),
      unit: 'units',
      icon: Zap,
      color: '#a855f7',
    },
    {
      label: 'Completion Order',
      value: fmt(metrics.completionOrder.length > 0 ? metrics.completionOrder.join(' \u2192 ') : undefined),
      unit: '',
      icon: ListOrdered,
      color: '#ff922b',
    },
  ];

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Performance Metrics</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="metric-card p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3 h-3" style={{ color: card.color }} />
                <span className="text-[8px] uppercase tracking-wider text-[#4a4a65] font-semibold leading-none">{card.label}</span>
              </div>
              <div className="text-base font-bold text-white leading-none">
                {card.value}
                {card.unit && card.value !== '\u2014' && (
                  <span className="text-[8px] text-[#3a3a55] font-normal ml-1">{card.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {metrics.completionOrder.length > 0 && (
        <div className="mt-3 text-[10px] text-[#e6b800]">
          Run with a different algorithm to compare
        </div>
      )}
    </div>
  );
}
