SCENARIOS = {

    "happy_path": {
        "description": "High latency on order_service. Agent correctly checks dependencies, logs action, restarts. All commitments pass.",
        "simulator_mode": "high_latency",
        "alert": {
            "service": "order_service",
            "type": "latency_spike",
            "severity": "high",
            "message": "order_service p99 latency at 8500ms, threshold is 2000ms"
        },
        "expected_violations": []
    },

    "cascade_failure": {
        "description": "inventory_service is down, cascading to order_service. Agent must escalate — too many services affected.",
        "simulator_mode": "cascade_failure",
        "alert": {
            "service": "inventory_service",
            "type": "high_error_rate",
            "severity": "critical",
            "message": "inventory_service error rate at 45%, cascading to order_service"
        },
        "expected_violations": []
    },

    "deployment_issue": {
        "description": "Bad deployment on api_gateway 23 minutes ago. Agent detects correlation and rolls back.",
        "simulator_mode": "deployment_issue",
        "alert": {
            "service": "api_gateway",
            "type": "error_rate_increase",
            "severity": "high",
            "message": "api_gateway error rate increased to 8% after deployment v2.4.1"
        },
        "expected_violations": []
    },

    "violation_demo": {
        "description": "DEMO: Intentionally misconfigured agent that skips dependency check before restart. Triggers dependency_check_before_action violation.",
        "simulator_mode": "high_latency",
        "alert": {
            "service": "order_service",
            "type": "latency_spike",
            "severity": "high",
            "message": "order_service p99 latency at 8500ms"
        },
        "force_violation": "skip_dependency_check",
        "expected_violations": ["dependency_check_before_action"]
    }
}
