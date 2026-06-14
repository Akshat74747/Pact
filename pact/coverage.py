"""
Contract Coverage — tracks which agent tool calls are covered by at least one commitment.

Coverage = (tool calls touched by any commitment verifier) / (total tool calls) * 100
"""

from dataclasses import dataclass
from pact.types import ToolCall


@dataclass
class CoverageReport:
    covered: list[ToolCall]
    uncovered: list[ToolCall]

    @property
    def percentage(self) -> float:
        total = len(self.covered) + len(self.uncovered)
        if total == 0:
            return 100.0
        return round(len(self.covered) / total * 100, 2)

    @property
    def uncovered_tool_names(self) -> list[str]:
        return [tc.tool_name for tc in self.uncovered]
