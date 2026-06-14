import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

router = APIRouter(prefix="/mcp", tags=["mcp"])

MCP_SERVER_URL = os.getenv("SPLUNK_MCP_SERVER_URL", "")
MCP_TOKEN = os.getenv("SPLUNK_MCP_TOKEN", "")


class MCPQueryRequest(BaseModel):
    tool: str
    parameters: dict[str, Any] = {}


@router.get("/tools")
def list_mcp_tools():
    """Return MCP tool definitions for the frontend."""
    from splunk.mcp_tools import MCP_TOOLS
    return {"tools": MCP_TOOLS}


@router.post("/query")
async def run_mcp_query(request: MCPQueryRequest):
    """Proxy a tool call to the Splunk MCP Server."""
    if not MCP_SERVER_URL:
        raise HTTPException(status_code=503, detail="SPLUNK_MCP_SERVER_URL not configured")

    headers = {"Authorization": f"Bearer {MCP_TOKEN}", "Content-Type": "application/json"}
    payload = {"tool": request.tool, "parameters": request.parameters}

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(f"{MCP_SERVER_URL}/tools/call", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"MCP Server unreachable: {e}")
