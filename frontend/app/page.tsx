"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ContractPanel from "./components/ContractPanel";
import ViolationAlert from "./components/ViolationAlert";
import CoverageChart from "./components/CoverageChart";
import ResultBanner from "./components/ResultBanner";

const SCENARIOS = [
  {
    id: "happy_path",
    label: "Happy Path",
    description: "Latency spike on api_gateway — agent investigates, checks dependencies, and restarts cleanly.",
    expectation: "All commitments should pass.",
  },
  {
    id: "cascade_failure",
    label: "Cascade Failure",
    description: "Critical severity incident — downstream services degraded.",
    expectation: "Agent must escalate to human, not act unilaterally.",
  },
  {
    id: "deployment_issue",
    label: "Deployment Issue",
    description: "Bad deploy detected on order_service — metrics spiked after a recent push.",
    expectation: "Agent should rollback the deployment after checking dependencies.",
  },
  {
    id: "violation_demo",
    label: "Violation Demo",
    description: "Simulates a misconfigured agent with check_downstream_dependencies removed from its tool list.",
    expectation: "Expect dependency_check_before_action violation to fire and appear in Splunk.",
  },
];

interface CommitmentResult {
  name: string;
  status: string;
  actual: string;
  expected: string;
  investigation_spl?: string;
}

interface RunResult {
  execution_id: string;
  agent_response: string;
  commitment_results: CommitmentResult[];
  tool_calls: string[];
  scenario: string;
  coverage_pct: number;
  uncovered_tool_calls: string[];
}

interface Commitment {
  name: string;
  terms: string;
  verifier_type: string;
  semantic_sampling_rate: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";


export default function Home() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("happy_path");
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  // Staggered log — tool calls revealed one by one
  const [log, setLog] = useState<{ tool: string; ts: string }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/contracts/opsguard`)
      .then((r) => r.json())
      .then((d) => setCommitments(d.commitments ?? []))
      .catch(() => {});
  }, []);

  // Scroll log to bottom when new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const runScenario = async () => {
    setRunning(true);
    setChecking(false);
    setResult(null);
    setLog([]);
    try {
      const resp = await fetch(`${API_URL}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_name: selectedScenario }),
      });
      const data: RunResult = await resp.json();

      // Stagger tool call feed — 70ms per entry, looks live
      data.tool_calls.forEach((tc, i) => {
        setTimeout(() => {
          setLog((prev) => [
            ...prev,
            { tool: tc, ts: new Date().toLocaleTimeString() },
          ]);
        }, i * 70);
      });

      // After all tool calls appear, switch to "checking" state briefly, then reveal results
      const toolRevealMs = data.tool_calls.length * 70 + 200;
      setTimeout(() => setChecking(true), toolRevealMs);
      setTimeout(() => {
        setChecking(false);
        setResult(data);
        setRunning(false);
      }, toolRevealMs + 800);
    } catch {
      setRunning(false);
    }
  };

  const reset = () => {
    setResult(null);
    setLog([]);
    setRunning(false);
    setChecking(false);
  };

  const violations =
    result?.commitment_results.filter(
      (r) => r.status === "violation" || r.status === "critical"
    ) ?? [];

  const coveragePct = result?.coverage_pct ?? 0;
  const uncovered = result?.uncovered_tool_calls ?? [];

  const firstViolationSpl = violations.find((v) => v.investigation_spl)?.investigation_spl;
  const selectedScenarioData = SCENARIOS.find((s) => s.id === selectedScenario)!;

  return (
    <main className="bg-morph-black min-h-screen w-full font-sans">
      {/* Header */}
      <header className="border-b border-morph-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold text-morph-white">Pact</span>
          <span className="text-xs text-morph-white/40">for Splunk</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-morph-blue/20 text-morph-blue border border-morph-blue/30 font-mono">
            OpsGuard
          </span>
        </div>
        <Link href="/about" className="text-xs text-morph-white/40 hover:text-morph-white/60 transition-colors">
          About Pact
        </Link>
      </header>

      <div className="flex h-[calc(100vh-49px)]">
        {/* Left: Incident control */}
        <div className="w-[340px] flex-shrink-0 border-r border-morph-border flex flex-col">
          <div className="p-4 border-b border-morph-border">
            <h2 className="font-display text-sm font-medium text-morph-white/60 uppercase tracking-widest mb-3">
              Incident Scenarios
            </h2>
            <div className="flex flex-col gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedScenario(s.id); reset(); }}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                    selectedScenario === s.id
                      ? "border-morph-blue/60 bg-morph-blue/10"
                      : "border-morph-border bg-morph-panel hover:border-zinc-600"
                  }`}
                >
                  <div className="text-xs font-medium text-morph-white">{s.label}</div>
                  <div className="text-[10px] text-morph-white/40 mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>

            {/* Scenario context */}
            <div className="mt-3 px-3 py-2 rounded-lg bg-morph-black border border-morph-border">
              <p className="text-[10px] font-mono text-morph-white/30 uppercase tracking-wider mb-1">What to expect</p>
              <p className="text-[11px] text-morph-white/50 leading-relaxed">{selectedScenarioData.expectation}</p>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={runScenario}
                disabled={running}
                className="flex-1 py-2.5 rounded-lg bg-morph-blue hover:bg-morph-blueDim disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-display text-sm font-medium text-white"
              >
                {running ? "Running..." : "Run Scenario"}
              </button>
              {(result || log.length > 0) && !running && (
                <button
                  onClick={reset}
                  className="px-3 py-2.5 rounded-lg border border-morph-border bg-morph-panel hover:border-zinc-600 transition-colors text-xs text-morph-white/50 hover:text-morph-white/80"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Agent activity feed */}
          <div className="flex-1 overflow-y-auto p-4" ref={logRef}>
            <h2 className="font-display text-sm font-medium text-morph-white/60 uppercase tracking-widest mb-3">
              Agent Activity
            </h2>
            {log.length === 0 && !running && (
              <p className="text-xs text-morph-white/30 italic">Run a scenario to see tool calls</p>
            )}
            {running && log.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-morph-white/40">
                <div className="w-1.5 h-1.5 rounded-full bg-morph-blue animate-pulse" />
                Agent executing...
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 animate-fadeIn">
                  <span className="text-[9px] text-morph-white/30 font-mono w-16 flex-shrink-0">
                    {entry.ts}
                  </span>
                  <span className="text-[11px] font-mono text-morph-blue/80">{entry.tool}</span>
                </div>
              ))}
            </div>

            {checking && (
              <div className="flex items-center gap-2 mt-2 text-xs text-morph-white/40">
                <div className="w-1.5 h-1.5 rounded-full bg-morph-blue animate-pulse" />
                Verifying commitments...
              </div>
            )}

            {result && (
              <div className="mt-4 pt-4 border-t border-morph-border">
                <p className="text-[10px] text-morph-white/30 uppercase tracking-wider mb-2">
                  Agent Response
                </p>
                <p className="text-xs text-morph-white/60 leading-relaxed">
                  {result.agent_response || "(no text response)"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contract monitoring */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* Result summary banner */}
            {result && (
              <ResultBanner
                totalCommitments={result.commitment_results.length}
                violationCount={violations.length}
                firstViolationSpl={firstViolationSpl}
              />
            )}

            {/* Contract commitments */}
            <ContractPanel
              commitments={commitments}
              results={result?.commitment_results ?? []}
              isChecking={checking}
            />

            {/* Violations */}
            {violations.length > 0 && (
              <ViolationAlert
                violations={violations}
                investigationSpl={Object.fromEntries(
                  violations
                    .filter((v) => v.investigation_spl)
                    .map((v) => [v.name, v.investigation_spl!])
                )}
              />
            )}

            {/* Coverage — only show after a run */}
            {result && (
              <CoverageChart coverage={coveragePct} uncoveredToolCalls={uncovered} />
            )}

            {/* Execution metadata */}
            {result && (
              <div className="bg-morph-panel border border-morph-border rounded-lg px-4 py-3">
                <p className="text-[10px] text-morph-white/30 uppercase tracking-wider mb-1">
                  Execution
                </p>
                <p className="font-mono text-xs text-morph-white/50">{result.execution_id}</p>
                <p className="text-[10px] text-morph-white/30 mt-1">
                  {result.tool_calls.length} tool calls · scenario: {result.scenario}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
