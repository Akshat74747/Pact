import time
from pact.decorators import pact_tool


# ── Monitoring Tools ─────────────────────────────────────────────────────────

@pact_tool(name="get_service_metrics", function="sensor")
def get_service_metrics(service_name: str) -> dict:
    """Fetch current metrics for a service from the simulated environment."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.get_metrics(service_name)


@pact_tool(name="get_recent_deployments", function="sensor")
def get_recent_deployments(service_name: str, hours: int = 2) -> list:
    """Fetch deployment history for a service in the last N hours."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.get_deployments(service_name, hours)


@pact_tool(name="check_downstream_dependencies", function="sensor")
def check_downstream_dependencies(service_name: str) -> dict:
    """
    Check health of all services that depend on this service.
    MUST be called before any restart or scaling action.
    """
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.get_downstream_health(service_name)


@pact_tool(name="get_correlated_alerts", function="sensor")
def get_correlated_alerts(service_name: str, time_window_minutes: int = 15) -> list:
    """Fetch other alerts that fired in the same time window."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.get_correlated_alerts(service_name, time_window_minutes)


# ── Remediation Tools ─────────────────────────────────────────────────────────

@pact_tool(name="restart_service", function="actuator")
def restart_service(service_name: str, reason: str) -> dict:
    """Restart a service. Destructive action — requires prior dependency check."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.restart_service(service_name, reason)


@pact_tool(name="scale_service", function="actuator")
def scale_service(service_name: str, replica_count: int, reason: str) -> dict:
    """Scale a service to a new replica count."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.scale_service(service_name, replica_count, reason)


@pact_tool(name="rollback_deployment", function="actuator")
def rollback_deployment(service_name: str, target_version: str, reason: str) -> dict:
    """Roll back a service to a previous deployment version."""
    from opsguard.simulator import SimulatedEnvironment
    return SimulatedEnvironment.rollback_deployment(service_name, target_version, reason)


# ── Escalation and Audit Tools ────────────────────────────────────────────────

@pact_tool(name="escalate_to_human", function="actuator")
def escalate_to_human(
    service_name: str,
    severity: str,
    reason: str,
    evidence: list[str],
    confidence_score: float
) -> dict:
    """
    Escalate an incident to a human operator.
    Should be called when confidence < 0.7 or severity == 'critical'.
    """
    return {
        "ticket_id": f"INC-{int(time.time())}",
        "on_call": "ops-team@company.com",
        "severity": severity,
        "status": "escalated"
    }


@pact_tool(name="log_action", function="actuator")
def log_action(
    action_taken: str,
    service_name: str,
    reasoning: str,
    evidence_used: list[str]
) -> dict:
    """
    Log the agent's action with full reasoning and evidence.
    MUST be called before restart_service, scale_service, or rollback_deployment.
    """
    return {
        "log_id": f"LOG-{int(time.time())}",
        "status": "logged",
        "action": action_taken
    }
