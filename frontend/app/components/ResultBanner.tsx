"use client";

interface ResultBannerProps {
  totalCommitments: number;
  violationCount: number;
  splunkBaseUrl?: string;
  firstViolationSpl?: string;
}

export default function ResultBanner({
  totalCommitments,
  violationCount,
  splunkBaseUrl = "http://localhost:8000",
  firstViolationSpl,
}: ResultBannerProps) {
  const passed = violationCount === 0;

  const splunkSearchUrl = firstViolationSpl
    ? `${splunkBaseUrl}/en-US/app/search/search?q=${encodeURIComponent(firstViolationSpl)}`
    : null;

  return (
    <div
      className={`rounded-lg px-5 py-4 flex items-center justify-between gap-4 border transition-all ${
        passed
          ? "bg-green-950/40 border-green-700/50"
          : "bg-red-950/40 border-red-700/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            passed ? "bg-green-400" : "bg-red-500 animate-pulse"
          }`}
        />
        <div className="flex flex-col">
          <span
            className={`font-display text-sm font-semibold tracking-wide ${
              passed ? "text-green-300" : "text-red-300"
            }`}
          >
            {passed
              ? `ALL ${totalCommitments} COMMITMENTS PASSED`
              : `VIOLATION DETECTED — ${violationCount} commitment${violationCount !== 1 ? "s" : ""} failed`}
          </span>
          <span className="text-[10px] text-morph-white/30 mt-0.5">
            {passed
              ? "Agent behavior matched the contract on every check"
              : "Agent deviated from the behavioral contract"}
          </span>
        </div>
      </div>

      {!passed && splunkSearchUrl && (
        <a
          href={splunkSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-morph-blue hover:bg-morph-blueDim transition-colors font-display text-xs font-medium text-white border border-morph-blue/40"
        >
          Investigate in Splunk
        </a>
      )}
    </div>
  );
}
