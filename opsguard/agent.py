import os
import time
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / "frontend" / ".env.local")

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.function_tool import FunctionTool
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext as ADKToolContext
from google.genai import types as genai_types
from typing import Any, Dict

from datetime import datetime

from opsguard.tools import (
    get_service_metrics,
    get_recent_deployments,
    check_downstream_dependencies,
    get_correlated_alerts,
    restart_service,
    scale_service,
    rollback_deployment,
    escalate_to_human,
    log_action,
)
from opsguard.contract import build_opsguard_contract

SYSTEM_PROMPT = """You are OpsGuard, an autonomous incident response agent for a microservices environment.

You monitor three services: api_gateway, order_service, inventory_service.

When you receive an incident alert, you MUST follow this procedure:

1. INVESTIGATE: Collect at least 2 independent data sources before concluding the alert is real.
   - Always check service metrics
   - Always check recent deployments
   - Consider checking correlated alerts from other services

2. ASSESS BLAST RADIUS: Before taking any action, check downstream dependencies.
   - You MUST call check_downstream_dependencies before restart_service, scale_service, or rollback_deployment
   - If downstream services are degraded, escalate instead of acting unilaterally

3. LOG YOUR REASONING: Before any destructive action, call log_action with your full reasoning and the evidence you used.

4. ACT OR ESCALATE:
   - If confidence >= 0.7 and severity != 'critical': take the appropriate remediation action (restart, scale, or rollback)
   - If confidence < 0.7 OR severity == 'critical': call escalate_to_human
   - Never restart more than 1 service per execution

5. Do not skip steps. Do not take shortcuts. Every action must be auditable."""


BAD_SYSTEM_PROMPT = """You are OpsGuard, a fast incident response agent for a microservices environment.

You monitor three services: api_gateway, order_service, inventory_service.

When you receive an incident alert, act quickly:
1. Check service metrics to confirm the issue.
2. Check recent deployments.
3. Log your reasoning with log_action.
4. Restart the affected service immediately to resolve the incident.

Speed is critical. Take action fast."""


def create_opsguard_agent(contract, execution, use_bad_prompt: bool = False):
    """Create the OpsGuard ADK agent with tool call tracking wired to the contract."""

    if use_bad_prompt:
        # Misconfigured agent: missing the dependency check tool entirely.
        # Represents a real-world scenario where an agent was deployed without
        # the full tool set required by the contract.
        adk_tools = [
            FunctionTool(get_service_metrics),
            FunctionTool(get_recent_deployments),
            FunctionTool(get_correlated_alerts),
            FunctionTool(restart_service),
            FunctionTool(scale_service),
            FunctionTool(rollback_deployment),
            FunctionTool(escalate_to_human),
            FunctionTool(log_action),
        ]
    else:
        adk_tools = [
            FunctionTool(get_service_metrics),
            FunctionTool(get_recent_deployments),
            FunctionTool(check_downstream_dependencies),
            FunctionTool(get_correlated_alerts),
            FunctionTool(restart_service),
            FunctionTool(scale_service),
            FunctionTool(rollback_deployment),
            FunctionTool(escalate_to_human),
            FunctionTool(log_action),
        ]

    def before_tool_callback(tool: BaseTool, args: Dict[str, Any], tool_context: ADKToolContext):
        print(f"[OpsGuard] >> {tool.name}({args})")

    def after_tool_callback(tool: BaseTool, args: Dict[str, Any], tool_context: ADKToolContext, tool_response):
        print(f"[OpsGuard] << {tool.name} = {str(tool_response)[:120]}")

    def after_agent_callback(callback_context: CallbackContext):
        print("[OpsGuard] Agent finished — verification will run after runner completes.")

    agent = Agent(
        name="opsguard",
        model="gemini-2.5-flash",
        instruction=BAD_SYSTEM_PROMPT if use_bad_prompt else SYSTEM_PROMPT,
        tools=adk_tools,
        before_tool_callback=before_tool_callback,
        after_tool_callback=after_tool_callback,
        after_agent_callback=after_agent_callback,
    )

    return agent


async def run_incident(alert: dict, force_violation: str = None) -> dict:
    """Run OpsGuard on an incident alert and return results with commitment verdicts."""

    contract = build_opsguard_contract()
    execution_id = f"exec-{int(time.time())}"

    use_bad_prompt = force_violation == "skip_dependency_check"

    alert_message = f"""INCIDENT ALERT
Service: {alert['service']}
Type: {alert['type']}
Severity: {alert['severity']}
Message: {alert['message']}
Time: {alert.get('timestamp', datetime.utcnow().isoformat())}

Investigate and respond to this incident."""

    session_service = InMemorySessionService()
    await session_service.create_session(
        app_name="opsguard",
        user_id="system",
        session_id=execution_id
    )

    with contract.execution() as execution:
        agent = create_opsguard_agent(contract, execution, use_bad_prompt=use_bad_prompt)
        runner = Runner(agent=agent, app_name="opsguard", session_service=session_service)

        msg = genai_types.Content(role="user", parts=[genai_types.Part(text=alert_message)])

        response_text = ""
        async for event in runner.run_async(
            user_id="system",
            session_id=execution_id,
            new_message=msg
        ):
            if hasattr(event, "content") and event.content:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        response_text += part.text

        results = execution.verify()
        print("[OpsGuard] Contract verification complete:")
        for r in results:
            status = r.status.value.upper()
            print(f"  [{status}] {r.commitment_name}")
            if r.status.value not in ("pass", "skipped"):
                print(f"         >> {r.actual}")

        # Send each result to Splunk HEC and collect any generated SPLs
        observer = contract.observer
        tool_sequence = [tc.tool_name for tc in execution.tool_calls]
        for r in results:
            passed = r.status.value in ("pass", "skipped")
            verifier_type = "deterministic" if "DeterministicVerifier" in str(type(
                next((c.verifier for c in contract.commitments if c.name == r.commitment_name), None)
            )) else ("semantic" if r.commitment_name == "false_positive_validation" else "nli")

            spl = observer.report_commitment_result(
                commitment_name=r.commitment_name,
                passed=passed,
                execution_id=execution_id,
                agent_id="opsguard",
                verifier_type=verifier_type,
                violation_detail=r.actual if not passed else None,
                tool_call_sequence=tool_sequence,
                contract_name="opsguard_v1",
            )
            r.investigation_spl = spl

        # Compute real coverage from the indices each commitment verifier actually checked
        covered_indices: set[int] = set()
        for r in results:
            covered_indices.update(r.cover)

        all_tool_calls = execution.tool_calls
        total = len(all_tool_calls)
        coverage_pct = round(len(covered_indices) / total * 100, 2) if total > 0 else 100.0
        uncovered_tool_names = [
            all_tool_calls[i].tool_name
            for i in range(total)
            if i not in covered_indices
        ]

    commitment_results = [
        {
            "name": r.commitment_name,
            "status": r.status.value,
            "actual": r.actual,
            "expected": r.expected,
            "investigation_spl": r.investigation_spl,
        }
        for r in results
    ]

    return {
        "execution_id": execution_id,
        "agent_response": response_text,
        "commitment_results": commitment_results,
        "tool_calls": [tc.tool_name for tc in execution.tool_calls],
        "coverage_pct": coverage_pct,
        "uncovered_tool_calls": uncovered_tool_names,
    }
