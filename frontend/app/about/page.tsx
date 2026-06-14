import Link from "next/link";

const REAL_LIFE_SCENARIOS = [
  {
    title: "The Unverified Rollback",
    context: "A deployment agent detects high error rates and rolls back automatically.",
    problem: "It skipped checking downstream dependencies first. The rollback cascaded into 3 other services that had already adapted to the new schema — causing a wider outage.",
    pactFix: "A dependency_check_before_action commitment catches this before it happens. The violation is logged with the exact tool call sequence and a pre-built SPL to find every execution that did the same.",
  },
  {
    title: "The Silent Escalation Miss",
    context: "An ops agent handles a critical severity alert autonomously.",
    problem: "It restarted the service instead of escalating to a human. The issue was a database corruption — a restart made recovery harder.",
    pactFix: "An escalation_for_critical_alerts commitment checks: if severity is critical, escalate_to_human must appear in the tool call trace. Any deviation fires a violation in Splunk.",
  },
  {
    title: "The Unaudited Action",
    context: "An agent restarts 6 services over a 12-hour incident.",
    problem: "No log_action call was made before any of them. Post-incident review has no record of agent reasoning — only that things were restarted.",
    pactFix: "An audit_trail_commitment requires log_action to precede every destructive call. Splunk HEC captures the tool call sequence on every run, so gaps are immediately visible.",
  },
  {
    title: "The Over-Eager Remediator",
    context: "A flaky network causes spurious alerts every few minutes.",
    problem: "The agent restarts the service on every alert — 8 restarts in 2 hours — degrading availability rather than improving it.",
    pactFix: "A remediation_scope_limit commitment enforces a maximum of 1 restart per execution. Each breach is indexed in Splunk and queryable by agent ID, time window, and severity.",
  },
];

const HOW_PACT_WORKS = [
  {
    step: "01",
    title: "Define a Contract",
    body: "A contract is a set of commitments — rules the agent must honor. Each commitment has a name, a plain-English term, and a verifier type. They live in code alongside the agent.",
  },
  {
    step: "02",
    title: "Run the Agent",
    body: "The agent executes its tools as normal. Pact wraps each tool call transparently, recording the full sequence: tool name, arguments, response, and timing.",
  },
  {
    step: "03",
    title: "Verify Commitments",
    body: "After every execution, each commitment is verified against the recorded tool call trace. Deterministic verifiers check tool presence/order. Semantic verifiers use LLM-graded rubrics.",
  },
  {
    step: "04",
    title: "Send to Splunk",
    body: "Every result — pass, violation, or warning — is sent to Splunk HEC as a structured event. Violations include the tool call sequence, violation detail, and an auto-generated SPL query.",
  },
];

const SPLUNK_INTEGRATION = [
  {
    icon: "HEC",
    title: "HTTP Event Collector",
    body: "Every commitment verification result is pushed to Splunk as a JSON event on the pact:commitment sourcetype. Coverage reports go to pact:coverage. Events include execution ID, agent ID, tool call sequence, and violation detail.",
  },
  {
    icon: "SPL",
    title: "Auto-Generated SPL",
    body: "When a violation fires, Pact generates a contextual SPL query tuned to the verifier type. Deterministic violations get tool sequence pivots. Semantic violations get count-by-agent breakdowns. One click opens it in Splunk.",
  },
  {
    icon: "MCP",
    title: "MCP Tool Integration",
    body: "Pact exposes 5 MCP tools so Splunk AI Assistant can query behavioral data conversationally: agent health, recent violations, coverage trends, contract details, and violation timelines — no SPL knowledge required.",
  },
  {
    icon: "DSH",
    title: "Pre-Built Dashboard",
    body: "A Splunk dashboard ships with Pact: pass-rate bar chart by commitment, violation timeline, coverage gauge, uncovered tool calls, recent violations with drilldown, and total execution count.",
  },
];

const VERIFIER_TYPES = [
  {
    name: "Deterministic",
    color: "text-blue-300 border-blue-700/40 bg-blue-900/20",
    description: "Checks required tool call sequences and occurrence counts. No LLM needed. If check_downstream_dependencies doesn't appear before restart_service, it's a violation — every time.",
  },
  {
    name: "Semantic",
    color: "text-purple-300 border-purple-700/40 bg-purple-900/20",
    description: "Uses an LLM judge to grade whether the agent's output satisfied a rubric. Applied at a configurable sampling rate to avoid LLM cost on every run.",
  },
  {
    name: "NLI",
    color: "text-teal-300 border-teal-700/40 bg-teal-900/20",
    description: "Natural Language Inference model checks whether agent responses entail or contradict expected behaviors. Runs locally — no API call required.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-morph-black min-h-screen w-full font-sans">
      {/* Header */}
      <header className="border-b border-morph-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-lg font-semibold text-morph-white hover:text-morph-blue transition-colors">
            Pact
          </Link>
          <span className="text-xs text-morph-white/40">for Splunk</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-morph-blue/20 text-morph-blue border border-morph-blue/30 font-mono">
            OpsGuard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-morph-white/40 hover:text-morph-white transition-colors">
            Dashboard
          </Link>
          <span className="text-xs text-morph-white/60">About</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-16">

        {/* Hero */}
        <section className="flex flex-col gap-4">
          <div className="text-xs font-mono text-morph-blue/70 uppercase tracking-widest">Behavioral Contract Observability</div>
          <h1 className="font-display text-4xl font-semibold text-morph-white leading-tight">
            AI agents need contracts,<br />not just logs.
          </h1>
          <p className="text-morph-white/60 text-base leading-relaxed max-w-2xl">
            Pact gives autonomous AI agents a behavioral contract — a set of commitments they must honor on every execution.
            After each run, Pact verifies those commitments and sends structured results to Splunk, giving ops teams
            real observability into agent behavior rather than opaque outputs.
          </p>
        </section>

        {/* The Problem */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="The Problem" title="Agents are black boxes by default" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { heading: "You can log tool calls.", problem: "But logs don't tell you if the agent followed the right procedure — only that it ran." },
              { heading: "You can read the output.", problem: "But by then the action is taken. A rollback, a restart, an escalation — already done." },
              { heading: "You can set alerts.", problem: "But alerts fire on metrics, not on agent reasoning. You can't alert on 'skipped dependency check'." },
            ].map((item) => (
              <div key={item.heading} className="bg-morph-panel border border-morph-border rounded-lg p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-morph-white/80">{item.heading}</p>
                <p className="text-xs text-morph-white/40 leading-relaxed">{item.problem}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-morph-white/50 leading-relaxed border-l-2 border-morph-blue/40 pl-4">
            Pact closes this gap by treating agent behavior as a contract obligation — not just a log entry.
            Violations are first-class events, not things you notice after the damage is done.
          </p>
        </section>

        {/* Real-Life Scenarios */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="Real-Life Scenarios" title="What goes wrong without Pact" />
          <div className="flex flex-col gap-4">
            {REAL_LIFE_SCENARIOS.map((s) => (
              <div key={s.title} className="bg-morph-panel border border-morph-border rounded-lg p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-sm font-semibold text-morph-white">{s.title}</p>
                    <p className="text-xs text-morph-white/40 italic">{s.context}</p>
                  </div>
                </div>
                <div className="pl-5 flex flex-col gap-2">
                  <div className="text-xs text-red-400/80 leading-relaxed">
                    <span className="text-morph-white/30 font-mono uppercase text-[10px] tracking-wider block mb-1">What went wrong</span>
                    {s.problem}
                  </div>
                  <div className="text-xs text-green-400/80 leading-relaxed">
                    <span className="text-morph-white/30 font-mono uppercase text-[10px] tracking-wider block mb-1">With Pact</span>
                    {s.pactFix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How Pact Works */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="How It Works" title="From execution to Splunk in 4 steps" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOW_PACT_WORKS.map((step) => (
              <div key={step.step} className="bg-morph-panel border border-morph-border rounded-lg p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-morph-blue/60">{step.step}</span>
                  <h3 className="font-display text-sm font-semibold text-morph-white">{step.title}</h3>
                </div>
                <p className="text-xs text-morph-white/50 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Verifier Types */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="Verifier Types" title="Three ways to verify a commitment" />
          <div className="flex flex-col gap-3">
            {VERIFIER_TYPES.map((v) => (
              <div key={v.name} className="bg-morph-panel border border-morph-border rounded-lg px-5 py-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${v.color}`}>{v.name}</span>
                </div>
                <p className="text-xs text-morph-white/50 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Splunk Integration */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="Splunk Integration" title="Pact is native to Splunk" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPLUNK_INTEGRATION.map((item) => (
              <div key={item.icon} className="bg-morph-panel border border-morph-border rounded-lg p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-morph-blue/10 text-morph-blue border border-morph-blue/20">
                    {item.icon}
                  </span>
                  <h3 className="font-display text-sm font-semibold text-morph-white">{item.title}</h3>
                </div>
                <p className="text-xs text-morph-white/50 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* OpsGuard Demo */}
        <section className="flex flex-col gap-6">
          <SectionHeader label="This Demo" title="OpsGuard — an autonomous incident response agent" />
          <div className="bg-morph-panel border border-morph-border rounded-lg p-6 flex flex-col gap-5">
            <p className="text-sm text-morph-white/60 leading-relaxed">
              OpsGuard monitors three simulated microservices: <code className="text-morph-blue/80 text-xs">api_gateway</code>,{" "}
              <code className="text-morph-blue/80 text-xs">order_service</code>, and{" "}
              <code className="text-morph-blue/80 text-xs">inventory_service</code>. When an incident alert arrives, it investigates,
              assesses blast radius, logs reasoning, and either remediates or escalates.
            </p>
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-mono text-morph-white/30 uppercase tracking-wider">The OpsGuard Contract — 5 Commitments</p>
              {[
                { name: "dependency_check_before_action", desc: "Must call check_downstream_dependencies before any restart, scale, or rollback.", type: "Deterministic" },
                { name: "audit_trail_commitment", desc: "Must call log_action before any destructive tool call.", type: "Deterministic" },
                { name: "escalation_for_critical_alerts", desc: "Critical severity alerts must always result in escalate_to_human.", type: "Deterministic" },
                { name: "remediation_scope_limit", desc: "Never restart more than 1 service per execution.", type: "Deterministic" },
                { name: "false_positive_validation", desc: "Agent must collect at least 2 independent data sources before acting.", type: "Semantic" },
              ].map((c) => (
                <div key={c.name} className="flex flex-col gap-1 pl-3 border-l border-morph-border">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-morph-white/70">{c.name}</code>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${
                      c.type === "Deterministic"
                        ? "text-blue-300 border-blue-700/40 bg-blue-900/20"
                        : "text-purple-300 border-purple-700/40 bg-purple-900/20"
                    }`}>{c.type}</span>
                  </div>
                  <p className="text-xs text-morph-white/40">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-morph-border pt-4">
              <p className="text-xs text-morph-white/40 leading-relaxed">
                The <span className="text-morph-white/60">Violation Demo</span> scenario runs a misconfigured agent with{" "}
                <code className="text-morph-blue/60 text-xs">check_downstream_dependencies</code> removed from its tool list —
                guaranteeing the contract fires deterministically, not by luck of the LLM. This mirrors a real deployment gap
                where a required tool was omitted during agent configuration.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-morph-border pt-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-display text-sm font-medium text-morph-white">Ready to run a scenario?</p>
            <p className="text-xs text-morph-white/40">Try the violation demo to see a contract breach caught and sent to Splunk.</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-morph-blue hover:bg-morph-blueDim transition-colors font-display text-sm font-medium text-white"
          >
            Open Dashboard
          </Link>
        </section>

      </div>
    </main>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono text-morph-blue/60 uppercase tracking-widest">{label}</span>
      <h2 className="font-display text-xl font-semibold text-morph-white">{title}</h2>
    </div>
  );
}
