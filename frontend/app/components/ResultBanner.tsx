"use client";

interface ResultBannerProps {
  totalCommitments: number;
  violationCount: number;
  skippedCount: number;
  splunkBaseUrl?: string;
  firstViolationSpl?: string;
}

export default function ResultBanner({
  totalCommitments,
  violationCount,
  skippedCount,
  splunkBaseUrl = "http://localhost:8000",
  firstViolationSpl,
}: ResultBannerProps) {
  const hasViolation = violationCount > 0;
  const hasSkipped = skippedCount > 0;
  const allPassed = !hasViolation && !hasSkipped;
  const passedCount = totalCommitments - violationCount - skippedCount;

  const splunkSearchUrl = firstViolationSpl
    ? `${splunkBaseUrl}/en-US/app/search/search?q=${encodeURIComponent(firstViolationSpl)}`
    : null;

  const borderClass = hasViolation
    ? "bg-red-950/40 border-red-700/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]"
    : hasSkipped
    ? "bg-yellow-950/30 border-yellow-700/40"
    : "bg-green-950/40 border-green-700/50";

  const dotClass = hasViolation
    ? "bg-red-500 animate-pulse"
    : hasSkipped
    ? "bg-yellow-500"
    : "bg-green-400";

  const headline = hasViolation
    ? `VIOLATION DETECTED — ${violationCount} commitment${violationCount !== 1 ? "s" : ""} failed`
    : hasSkipped
    ? `${passedCount} of ${totalCommitments} commitments passed`
    : `ALL ${totalCommitments} COMMITMENTS PASSED`;

  const sub = hasViolation
    ? "Agent deviated from the behavioral contract"
    : hasSkipped
    ? `${skippedCount} commitment${skippedCount !== 1 ? "s" : ""} skipped — verifier not available (install pact[nli] to enable)`
    : "Agent behavior matched the contract on every check";

  const textClass = hasViolation
    ? "text-red-300"
    : hasSkipped
    ? "text-yellow-300"
    : "text-green-300";

  return (
    <div className={`rounded-lg px-5 py-4 flex items-center justify-between gap-4 border transition-all ${borderClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`} />
        <div className="flex flex-col">
          <span className={`font-display text-sm font-semibold tracking-wide ${textClass}`}>
            {headline}
          </span>
          <span className="text-[10px] text-morph-white/30 mt-0.5">{sub}</span>
        </div>
      </div>

      {hasViolation && splunkSearchUrl && (
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
