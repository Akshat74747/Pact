"""
Pact: Contract-based verification for AI agents.

A framework for defining behavioral contracts and verifying AI agent compliance
using both deterministic and semantic (LLM-based) verification. Integrates with
observability backends and supports progressive hardening from semantic to
deterministic verifiers as failure modes are discovered.
"""

from pact.contract import Contract
from pact.commitment import Commitment
from pact.execution import Execution
from pact.types import VerificationResult, VerificationResultStatus, ToolCall, IntermediateVerificationResult
from pact.observers.base import Observer
from pact.observers.splunk_observer import SplunkObservability
from pact.verifiers.nli import nli_verifier
from pact.verifiers.semantic import semantic_verifier

__all__ = [
    "Contract",
    "Commitment",
    "Execution",
    "VerificationResult",
    "IntermediateVerificationResult",
    "VerificationResultStatus",
    "ToolCall",
    "Observer",
    "SplunkObservability",
    "nli_verifier",
    "semantic_verifier",
]
