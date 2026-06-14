"use client";

import { useEffect, useState } from "react";

interface Commitment {
  name: string;
  terms: string;
  verifier_type: string;
  semantic_sampling_rate: number;
}

interface CommitmentResult {
  name: string;
  status: string;
  actual: string;
  expected: string;
}

interface ContractPanelProps {
  commitments: Commitment[];
  results: CommitmentResult[];
  isChecking?: boolean;
}

const VERIFIER_BADGE: Record<string, { label: string; color: string }> = {
  DeterministicVerifier: { label: "Deterministic", color: "bg-blue-900/40 text-blue-300 border border-blue-700/40" },
  semantic: { label: "Semantic", color: "bg-purple-900/40 text-purple-300 border border-purple-700/40" },
  function: { label: "NLI", color: "bg-teal-900/40 text-teal-300 border border-teal-700/40" },
};

const STATUS_DOT: Record<string, string> = {
  pass: "bg-green-500",
  violation: "bg-red-500",
  critical: "bg-red-600",
  warning: "bg-yellow-500",
  skipped: "bg-zinc-600",
  verification_error: "bg-orange-500",
};

const CARD_BORDER: Record<string, string> = {
  pass: "border-morph-border",
  violation: "border-red-700/60",
  critical: "border-red-700/60",
  warning: "border-yellow-700/40",
  skipped: "border-morph-border",
  verification_error: "border-orange-700/40",
};

export default function ContractPanel({ commitments, results, isChecking = false }: ContractPanelProps) {
  const resultMap = Object.fromEntries(results.map((r) => [r.name, r]));

  // Track which cards have "revealed" their result (for staggered animation)
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (results.length === 0) {
      setRevealed(new Set());
      return;
    }
    // Stagger reveal: each card flips 120ms apart
    const timers: ReturnType<typeof setTimeout>[] = [];
    commitments.forEach((c, i) => {
      if (resultMap[c.name]) {
        timers.push(
          setTimeout(() => {
            setRevealed((prev) => new Set(prev).add(c.name));
          }, i * 120)
        );
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [results]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-medium text-morph-white/60 uppercase tracking-widest mb-1">
        Contract Commitments
      </h2>
      {commitments.map((c) => {
        const result = resultMap[c.name];
        const isRevealed = revealed.has(c.name);
        const isCheckingThis = isChecking && !result;

        let status = "pending";
        if (isCheckingThis) status = "checking";
        else if (result && isRevealed) status = result.status;
        else if (result && !isRevealed) status = "checking";

        const dotClass =
          status === "checking"
            ? "bg-morph-blue animate-pulse"
            : (STATUS_DOT[status] ?? "bg-zinc-600 animate-pulse");

        const borderClass =
          status === "checking" || status === "pending"
            ? "border-morph-border"
            : (CARD_BORDER[status] ?? "border-morph-border");

        const badge = VERIFIER_BADGE[c.verifier_type] ?? {
          label: c.verifier_type,
          color: "bg-zinc-800 text-zinc-400",
        };

        return (
          <div
            key={c.name}
            className={`bg-morph-panel border rounded-lg px-4 py-3 flex flex-col gap-1 transition-all duration-500 ${borderClass} ${
              status === "violation" || status === "critical"
                ? "shadow-[0_0_16px_rgba(239,68,68,0.12)]"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${dotClass}`} />
                <span className="font-mono text-xs text-morph-white/80 truncate">{c.name}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-morph-white/50 pl-4">{c.terms}</p>
            {result && isRevealed && status !== "pass" && status !== "pending" && status !== "skipped" && (
              <p className="text-xs text-red-400/80 pl-4 mt-0.5 font-mono animate-fadeIn">{result.actual}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
