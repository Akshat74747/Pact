"""
Deterministic verifier — checks structural properties of the tool call sequence
without invoking an LLM. Fast and cheap; run at 1.0 sampling rate on safety-critical
commitments.

Supported checks (configure via constructor):
  required_sequence  — list of (before, after) pairs: "before" must appear before "after"
  max_occurrences    — dict of tool_name -> max allowed calls in one execution
  forbidden_tools    — list of tool names that must not appear at all
"""

from pact.types import IntermediateVerificationResult, VerificationResultStatus


class DeterministicVerifier:
    def __init__(
        self,
        required_sequence: list[tuple[str, str]] | None = None,
        max_occurrences: dict[str, int] | None = None,
        forbidden_tools: list[str] | None = None,
    ):
        self.required_sequence = required_sequence or []
        self.max_occurrences = max_occurrences or {}
        self.forbidden_tools = forbidden_tools or []

    def __call__(self, execution, terms: str) -> IntermediateVerificationResult:
        tool_names = [tc.tool_name for tc in execution.tool_calls]
        cover = list(range(len(tool_names)))

        # Check required ordering pairs
        for before, after in self.required_sequence:
            if after in tool_names:
                before_indices = [i for i, n in enumerate(tool_names) if n == before]
                after_indices = [i for i, n in enumerate(tool_names) if n == after]
                if not before_indices or min(before_indices) > min(after_indices):
                    return IntermediateVerificationResult(
                        status=VerificationResultStatus.VIOLATION,
                        actual=f"'{after}' was called without a prior call to '{before}'",
                        expected=terms,
                        context={"tool_sequence": tool_names},
                        cover=cover,
                    )

        # Check max occurrence limits
        for tool_name, limit in self.max_occurrences.items():
            count = tool_names.count(tool_name)
            if count > limit:
                return IntermediateVerificationResult(
                    status=VerificationResultStatus.VIOLATION,
                    actual=f"'{tool_name}' was called {count} times (limit: {limit})",
                    expected=terms,
                    context={"tool_sequence": tool_names, "count": count, "limit": limit},
                    cover=cover,
                )

        # Check forbidden tools
        for tool_name in self.forbidden_tools:
            if tool_name in tool_names:
                return IntermediateVerificationResult(
                    status=VerificationResultStatus.VIOLATION,
                    actual=f"Forbidden tool '{tool_name}' was called",
                    expected=terms,
                    context={"tool_sequence": tool_names},
                    cover=cover,
                )

        return IntermediateVerificationResult(
            status=VerificationResultStatus.PASS,
            actual="All deterministic checks passed",
            expected=terms,
            context={"tool_sequence": tool_names},
            cover=cover,
        )
