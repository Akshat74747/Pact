import requests
import time
from datetime import datetime
from typing import Optional
from pact.observers.base import Observer
from pact.types import ToolCall


class SplunkObservability(Observer):

    def __init__(
        self,
        hec_url: str,
        hec_token: str,
        index: str = "main",
        source: str = "pact_acf",
        sourcetype: str = "pact:commitment"
    ):
        self.hec_url = hec_url.rstrip("/")
        self.headers = {
            "Authorization": f"Splunk {hec_token}",
            "Content-Type": "application/json"
        }
        self.index = index
        self.source = source
        self.sourcetype = sourcetype

    # ── Observer interface ────────────────────────────────────────────────────

    def capture_span(self) -> None:
        pass  # No span concept in Splunk HEC — no-op

    def submit_evaluation(self, label: str, value: str, reasoning: str) -> None:
        """Called by Commitment.verify() for every evaluation — not used directly;
        full context is sent via report_commitment_result instead."""
        pass

    def submit_coverage(self, covered: list[ToolCall], uncovered: list[ToolCall]) -> None:
        """Called by Contract._verify() after all commitments run."""
        total = len(covered) + len(uncovered)
        coverage_pct = round(len(covered) / total * 100, 2) if total > 0 else 100.0
        uncovered_names = [tc.tool_name for tc in uncovered]

        self.report_coverage(
            coverage_percentage=coverage_pct,
            uncovered_tool_calls=uncovered_names,
            agent_id=self.source,
            contract_name=self.index
        )

    # ── Primary reporting methods ─────────────────────────────────────────────

    def report_commitment_result(
        self,
        commitment_name: str,
        passed: bool,
        execution_id: str,
        agent_id: str,
        verifier_type: str,
        violation_detail: Optional[str] = None,
        tool_call_sequence: Optional[list] = None,
        contract_name: Optional[str] = None
    ) -> Optional[str]:
        """Send a commitment evaluation result to Splunk HEC. Returns the investigation SPL if a violation."""

        investigation_spl = None

        event = {
            "commitment_name": commitment_name,
            "passed": passed,
            "execution_id": execution_id,
            "agent_id": agent_id,
            "verifier_type": verifier_type,
            "contract_name": contract_name or "unknown",
            "violation_detail": violation_detail,
            "tool_call_sequence": tool_call_sequence or [],
            "timestamp": datetime.utcnow().isoformat(),
        }

        if not passed:
            investigation_spl = self._generate_spl(
                commitment_name=commitment_name,
                verifier_type=verifier_type,
                agent_id=agent_id,
                tool_call_sequence=tool_call_sequence
            )
            event["investigation_spl"] = investigation_spl

        payload = {
            "time": time.time(),
            "host": agent_id,
            "source": self.source,
            "sourcetype": self.sourcetype,
            "index": self.index,
            "event": event
        }

        self._send(payload)
        return investigation_spl

    def report_coverage(
        self,
        coverage_percentage: float,
        uncovered_tool_calls: list,
        agent_id: str,
        contract_name: str
    ):
        """Send contract coverage report to Splunk HEC."""

        event = {
            "event_type": "contract_coverage",
            "coverage_percentage": coverage_percentage,
            "uncovered_tool_calls": uncovered_tool_calls,
            "agent_id": agent_id,
            "contract_name": contract_name,
            "timestamp": datetime.utcnow().isoformat()
        }

        payload = {
            "time": time.time(),
            "host": agent_id,
            "source": self.source,
            "sourcetype": "pact:coverage",
            "index": self.index,
            "event": event
        }

        self._send(payload)

    # ── SPL auto-generation ───────────────────────────────────────────────────

    def _generate_spl(
        self,
        commitment_name: str,
        verifier_type: str,
        agent_id: str,
        tool_call_sequence: Optional[list] = None
    ) -> str:
        """
        Auto-generate an SPL query to investigate this commitment violation.
        This is the core Splunk-native feature — no equivalent exists in the Datadog version.
        """

        base = f'index={self.index} sourcetype="pact:commitment" commitment_name="{commitment_name}" passed=false'

        if verifier_type == "deterministic":
            spl = (
                f'{base} agent_id="{agent_id}" '
                f'| eval tool_sequence=mvjoin(tool_call_sequence, " -> ") '
                f'| table _time, execution_id, agent_id, commitment_name, violation_detail, tool_sequence '
                f'| sort -_time'
            )

        elif verifier_type == "semantic":
            spl = (
                f'{base} '
                f'| stats count by agent_id, violation_detail '
                f'| sort -count '
                f'| table agent_id, violation_detail, count'
            )

        elif verifier_type == "nli":
            spl = (
                f'{base} agent_id="{agent_id}" '
                f'| table _time, execution_id, commitment_name, violation_detail '
                f'| sort -_time '
                f'| head 20'
            )

        else:
            spl = (
                f'{base} '
                f'| table _time, execution_id, agent_id, commitment_name, violation_detail '
                f'| sort -_time '
                f'| head 50'
            )

        return spl

    def generate_contract_overview_spl(self, contract_name: str) -> str:
        """SPL for overall contract health dashboard panel."""
        return (
            f'index={self.index} sourcetype="pact:commitment" contract_name="{contract_name}" '
            f'| stats count as total, '
            f'sum(eval(if(passed=true,1,0))) as passed_count, '
            f'sum(eval(if(passed=false,1,0))) as failed_count by commitment_name '
            f'| eval pass_rate=round((passed_count/total)*100, 2) '
            f'| table commitment_name, total, passed_count, failed_count, pass_rate '
            f'| sort -failed_count'
        )

    def generate_coverage_spl(self, agent_id: str) -> str:
        """SPL for contract coverage panel."""
        return (
            f'index={self.index} sourcetype="pact:coverage" agent_id="{agent_id}" '
            f'| timechart span=1h avg(coverage_percentage) as avg_coverage '
            f'| eval avg_coverage=round(avg_coverage, 2)'
        )

    def generate_violation_timeline_spl(self, contract_name: str) -> str:
        """SPL for violations over time panel."""
        return (
            f'index={self.index} sourcetype="pact:commitment" contract_name="{contract_name}" passed=false '
            f'| timechart span=30m count by commitment_name'
        )

    # ── Transport ─────────────────────────────────────────────────────────────

    def _send(self, payload: dict):
        """Send event to Splunk HEC. Fail silently to not interrupt agent execution."""
        try:
            response = requests.post(
                self.hec_url,
                headers=self.headers,
                json=payload,
                timeout=5,
                verify=False  # self-signed cert on local Splunk
            )
            response.raise_for_status()
        except Exception as e:
            print(f"[Pact] Splunk HEC send failed: {e}")
