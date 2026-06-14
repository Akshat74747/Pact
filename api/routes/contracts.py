from fastapi import APIRouter
from opsguard.contract import build_opsguard_contract

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("/opsguard")
def get_opsguard_contract():
    """Return OpsGuard contract definition for the frontend ContractPanel."""
    contract = build_opsguard_contract()
    return {
        "commitments": [
            {
                "name": c.name,
                "terms": c.terms,
                "verifier_type": type(c.verifier).__name__ if c.verifier else "semantic",
                "semantic_sampling_rate": c.semantic_sampling_rate,
            }
            for c in contract.commitments
        ]
    }
