import React from 'react';
import { formatBdt } from '../../lib/api';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#4F46E5', '#0D9488', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B'];

export function SimpleBarChart({
  data,
  height = 200,
  isCurrency = true,
}: {
  data: ChartDatum[];
  height?: number;
  isCurrency?: boolean;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">No chart data available yet.</p>;
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div
        className="flex items-end gap-3 border-b border-slate-200 pb-2 px-2"
        style={{ height }}
      >
        {data.map((d, idx) => {
          const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span className="text-[11px] font-mono tabular-nums text-slate-600 mb-1 truncate max-w-full">
                {isCurrency ? formatBdt(d.value) : d.value}
              </span>
              <div
                className="w-full max-w-[44px] rounded-t-md transition-all duration-300"
                style={{
                  height: `${pct}%`,
                  backgroundColor: d.color || PALETTE[idx % PALETTE.length],
                }}
                title={`${d.label}: ${isCurrency ? formatBdt(d.value) : d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 px-2 pt-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-xs text-slate-600 truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBreakdownChart({
  data,
  isCurrency = true,
}: {
  data: ChartDatum[];
  isCurrency?: boolean;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">No records available yet.</p>;
  }
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, idx) => {
        const barPct = Math.max(4, Math.round((d.value / maxVal) * 100));
        const sharePct = Math.round((d.value / total) * 100);
        return (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate pr-2">{d.label}</span>
              <span className="font-mono tabular-nums text-slate-600 shrink-0">
                {isCurrency ? formatBdt(d.value) : d.value} · {sharePct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barPct}%`,
                  backgroundColor: d.color || PALETTE[idx % PALETTE.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
