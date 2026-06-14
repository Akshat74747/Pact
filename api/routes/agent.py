from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from opsguard.agent import run_incident
from opsguard.scenarios import SCENARIOS
from opsguard.simulator import SimulatedEnvironment

router = APIRouter(prefix="/agent", tags=["agent"])


class IncidentRequest(BaseModel):
    scenario_name: str = "happy_path"
    custom_alert: Optional[dict] = None


class CommitmentResult(BaseModel):
    name: str
    status: str
    actual: str
    expected: str
    investigation_spl: Optional[str] = None


class IncidentResponse(BaseModel):
    execution_id: str
    agent_response: str
    commitment_results: list[CommitmentResult]
    tool_calls: list[str]
    scenario: str
    coverage_pct: float = 100.0
    uncovered_tool_calls: list[str] = []


@router.post("/run", response_model=IncidentResponse)
async def run_scenario(request: IncidentRequest):
    if request.custom_alert:
        alert = request.custom_alert
        force_violation = None
        scenario_label = "custom"
    elif request.scenario_name in SCENARIOS:
        scenario = SCENARIOS[request.scenario_name]
        SimulatedEnvironment.set_scenario(scenario["simulator_mode"])
        alert = scenario["alert"]
        force_violation = scenario.get("force_violation")
        scenario_label = request.scenario_name
    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {request.scenario_name}")

    result = await run_incident(alert, force_violation=force_violation)

    return IncidentResponse(
        execution_id=result["execution_id"],
        agent_response=result["agent_response"],
        commitment_results=[CommitmentResult(**r) for r in result["commitment_results"]],
        tool_calls=result["tool_calls"],
        scenario=scenario_label,
        coverage_pct=result["coverage_pct"],
        uncovered_tool_calls=result["uncovered_tool_calls"],
    )


@router.get("/scenarios")
def list_scenarios():
    return {"scenarios": list(SCENARIOS.keys()), "details": SCENARIOS}
