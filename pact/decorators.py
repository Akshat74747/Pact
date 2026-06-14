"""
Tool decorator pattern for Pact contracts.

The primary decorator API lives on the Contract class itself:
    contract.sensor(fn)   — marks a function as a read-only sensor tool
    contract.actuator(fn) — marks a function as a state-changing actuator tool

These standalone helpers are thin wrappers for cases where the contract
instance is not in scope at decoration time.
"""

from pact.contract import Contract
from pact.execution import _context_execution
from typing import Callable, Literal, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def pact_tool(
    name: str | None = None,
    function: Literal["sensor", "actuator"] = "actuator",
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator that registers a function as a traced Pact tool.

    The function is traced against whichever Contract is active in the current
    execution context when it is called at runtime.
    """
    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        from functools import wraps
        import time
        import inspect
        from datetime import datetime
        from pact.types import ToolCall, ToolContext

        tool_name = name or fn.__name__

        @wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            try:
                execution = _context_execution.get()
            except LookupError:
                return fn(*args, **kwargs)

            sig = inspect.signature(fn)
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()
            named_args = dict(bound.arguments)

            start_time = time.time()
            error: Exception | None = None
            result = None

            try:
                result = fn(*args, **kwargs)
            except Exception as e:
                error = e
                raise
            finally:
                end_time = time.time()
                execution.tool_calls.append(
                    ToolCall(
                        tool_name=tool_name,
                        function=function,
                        args=named_args,
                        tool_context=ToolContext(
                            started_at=datetime.fromtimestamp(start_time),
                            ended_at=datetime.fromtimestamp(end_time),
                            duration_ms=(end_time - start_time) * 1000,
                        ),
                        tool_response=result,
                        error=error,
                    )
                )

            return result

        return wrapper

    return decorator
