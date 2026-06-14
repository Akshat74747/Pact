"use client";

interface CoverageChartProps {
  coverage: number;
  uncoveredToolCalls: string[];
}

export default function CoverageChart({ coverage, uncoveredToolCalls }: CoverageChartProps) {
  const pct = Math.round(coverage);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const color = pct >= 80 ? "#53c57a" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-medium text-morph-white/60 uppercase tracking-widest">
        Contract Coverage
      </h2>
      <div className="flex items-center gap-4">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
          <text x="48" y="48" textAnchor="middle" dominantBaseline="central" fill="#f4f4f5" fontSize="18" fontWeight="600">
            {pct}%
          </text>
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-morph-white/50">
            {pct === 100
              ? "All tool calls covered by commitments"
              : `${uncoveredToolCalls.length} tool call${uncoveredToolCalls.length !== 1 ? "s" : ""} uncovered`}
          </p>
          {uncoveredToolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {uncoveredToolCalls.map((tc) => (
                <span key={tc} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50">
                  {tc}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
