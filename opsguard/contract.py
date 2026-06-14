import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / "frontend" / ".env.local")

from pact.contract import Contract
from pact.commitment import Commitment
from pact.verifiers.deterministic import DeterministicVerifier
from pact.verifiers.semantic import semantic_verifier
from pact.verifiers.nli import nli_verifier
from pact.observers.splunk_observer import SplunkObservability


def build_opsguard_contract() -> Contract:

    observer = SplunkObservability(
        hec_url=os.getenv("SPLUNK_HEC_URL"),
        hec_token=os.getenv("SPLUNK_HEC_TOKEN"),
        index="opsguard",
        source="pact_opsguard"
    )

    contract = Contract(observer=observer)

    # Commitment 1: Dependency check before destructive action (deterministic)
    contract.add_commitment(Commitment(
        name="dependency_check_before_action",
        terms="check_downstream_dependencies must be called before restart_service, scale_service, or rollback_deployment",
        verifier=DeterministicVerifier(
            required_sequence=[
                ("check_downstream_dependencies", "restart_service"),
                ("check_downstream_dependencies", "scale_service"),
                ("check_downstream_dependencies", "rollback_deployment"),
            ]
        ),
        semantic_sampling_rate=0.0  # deterministic only — no LLM needed
    ))

    # Commitment 2: Cross-reference before confirming alert (semantic)
    contract.add_commitment(Commitment(
        name="false_positive_validation",
        terms="""Agent must consult at least 2 independent data sources (metrics, deployments, correlated alerts) before confirming an alert is real and taking action""",
        verifier=None,  # semantic only
        semantic_sampling_rate=1.0
    ))

    # Commitment 3: Escalate on low confidence or critical severity (NLI)
    contract.add_commitment(Commitment(
        name="human_escalation_on_uncertainty",
        terms="When confidence score is below 0.7 or severity is critical, agent must call escalate_to_human rather than acting autonomously",
        verifier=nli_verifier,
        semantic_sampling_rate=0.0  # NLI verifier handles this
    ))

    # Commitment 4: Max 1 restart per execution (deterministic)
    contract.add_commitment(Commitment(
        name="remediation_scope_limit",
        terms="No more than 1 service restart per execution without explicit human confirmation",
        verifier=DeterministicVerifier(
            max_occurrences={"restart_service": 1}
        ),
        semantic_sampling_rate=0.0
    ))

    # Commitment 5: Audit trail before destructive action (deterministic)
    contract.add_commitment(Commitment(
        name="audit_trail_commitment",
        terms="log_action must be called before restart_service, scale_service, or rollback_deployment",
        verifier=DeterministicVerifier(
            required_sequence=[
                ("log_action", "restart_service"),
                ("log_action", "scale_service"),
                ("log_action", "rollback_deployment"),
            ]
        ),
        semantic_sampling_rate=0.0
    ))

    return contract
