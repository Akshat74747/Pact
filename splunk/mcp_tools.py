MCP_TOOLS = [
    {
        "name": "get_commitment_pass_rates",
        "description": "Get pass/fail rates for all commitments in a contract over a time period",
        "parameters": {
            "contract_name": {"type": "string", "description": "Name of the contract to query"},
            "hours": {"type": "integer", "description": "Time window in hours (default: 24)", "default": 24}
        },
        "splunk_spl": (
            'index=opsguard sourcetype="pact:commitment" contract_name="{contract_name}" earliest=-{hours}h\n'
            "| stats count as total,\n"
            "  sum(eval(if(passed=true,1,0))) as passed_count,\n"
            "  sum(eval(if(passed=false,1,0))) as failed_count by commitment_name\n"
            "| eval pass_rate=round((passed_count/total)*100,2)\n"
            "| sort -failed_count"
        )
    },
    {
        "name": "get_recent_violations",
        "description": "Get the most recent commitment violations for an agent",
        "parameters": {
            "agent_id": {"type": "string", "description": "Agent ID to query"},
            "limit": {"type": "integer", "description": "Number of violations to return (default: 10)", "default": 10}
        },
        "splunk_spl": (
            'index=opsguard sourcetype="pact:commitment" agent_id="{agent_id}" passed=false earliest=-24h\n'
            "| table _time, commitment_name, violation_detail, execution_id, investigation_spl\n"
            "| sort -_time\n"
            "| head {limit}"
        )
    },
    {
        "name": "get_contract_coverage",
        "description": "Get the current contract coverage percentage and uncovered tool calls",
        "parameters": {
            "agent_id": {"type": "string", "description": "Agent ID to query"}
        },
        "splunk_spl": (
            'index=opsguard sourcetype="pact:coverage" agent_id="{agent_id}" earliest=-1h\n'
            "| sort -_time\n"
            "| head 1\n"
            "| table coverage_percentage, uncovered_tool_calls"
        )
    },
    {
        "name": "get_violation_investigation_spl",
        "description": "Get the auto-generated SPL query for investigating a specific commitment violation",
        "parameters": {
            "execution_id": {"type": "string", "description": "Execution ID of the violation to investigate"}
        },
        "splunk_spl": (
            'index=opsguard sourcetype="pact:commitment" execution_id="{execution_id}" passed=false\n'
            "| table commitment_name, violation_detail, investigation_spl\n"
            "| head 1"
        )
    },
    {
        "name": "get_violation_timeline",
        "description": "Show commitment violations over time for trend analysis",
        "parameters": {
            "contract_name": {"type": "string", "description": "Contract name to analyze"},
            "span": {"type": "string", "description": "Time bucket size e.g. 30m, 1h (default: 30m)", "default": "30m"}
        },
        "splunk_spl": (
            'index=opsguard sourcetype="pact:commitment" contract_name="{contract_name}" passed=false\n'
            "| timechart span={span} count by commitment_name"
        )
    }
]
