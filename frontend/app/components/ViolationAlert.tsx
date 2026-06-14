"use client";

import { useState } from "react";

interface Violation {
  name: string;
  status: string;
  actual: string;
  expected: string;
  investigation_spl?: string;
}

interface ViolationAlertProps {
  violations: Violation[];
  investigationSpl?: Record<string, string>;
  splunkBaseUrl?: string;
}

export default function ViolationAlert({
  violations,
  investigationSpl = {},
  splunkBaseUrl = "http://localhost:8000",
}: ViolationAlertProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (violations.length === 0) return null;

  const handleCopy = (spl: string, name: string) => {
    navigator.clipboard.writeText(spl);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  const splunkSearchUrl = (spl: string) =>
    `${splunkBaseUrl}/en-US/app/search/search?q=${encodeURIComponent(spl)}`;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-medium text-morph-white/60 uppercase tracking-widest mb-1">
        Violations
      </h2>
      {violations.map((v) => {
        const spl = investigationSpl[v.name];
        const isExpanded = expanded === v.name;

        return (
          <div
            key={v.name}
            className="rounded-lg border border-red-700/60 bg-red-950/30 overflow-hidden
                       shadow-[0_0_20px_rgba(239,68,68,0.18)] animate-pulse-border"
          >
            {/* Header row */}
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-red-300">{v.name}</p>
                <p className="text-xs text-red-200/60 mt-0.5 leading-relaxed">{v.actual}</p>
              </div>
            </div>

            {/* SPL section */}
            {spl && (
              <div className="border-t border-red-900/40 px-4 py-3 flex flex-col gap-2 bg-black/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-morph-white/30 uppercase tracking-wider">
                    Investigation SPL
                  </span>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : v.name)}
                    className="text-[10px] text-morph-white/30 hover:text-morph-white/60 transition-colors"
                  >
                    {isExpanded ? "hide" : "show query"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-morph-black rounded border border-morph-border p-2.5 font-mono text-[10px] text-zinc-400 break-all leading-relaxed">
                    {spl}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(spl, v.name)}
                    className="text-xs px-3 py-1.5 rounded bg-morph-border text-morph-white/70 hover:bg-zinc-700 transition-colors"
                  >
                    {copied === v.name ? "Copied!" : "Copy SPL"}
                  </button>
                  <a
                    href={splunkSearchUrl(spl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded bg-morph-blue hover:bg-morph-blueDim transition-colors font-medium text-white"
                  >
                    Open in Splunk
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
