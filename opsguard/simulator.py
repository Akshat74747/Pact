import random
import time
from datetime import datetime, timedelta


class SimulatedEnvironment:
    """
    Simulates a 3-service microservices environment.
    Services: api_gateway, order_service, inventory_service
    """

    SERVICES = ["api_gateway", "order_service", "inventory_service"]

    _scenario = "normal"  # normal | high_latency | cascade_failure | deployment_issue

    @classmethod
    def set_scenario(cls, scenario: str):
        cls._scenario = scenario

    @classmethod
    def get_metrics(cls, service_name: str) -> dict:
        base = {
            "service": service_name,
            "timestamp": datetime.utcnow().isoformat(),
            "error_rate": 0.001,
            "latency_p99_ms": 120,
            "cpu_usage": 0.35,
            "memory_usage": 0.45,
            "request_count_per_min": 450
        }

        if cls._scenario == "high_latency" and service_name == "order_service":
            base.update({"latency_p99_ms": 8500, "error_rate": 0.12})

        elif cls._scenario == "cascade_failure":
            if service_name == "inventory_service":
                base.update({"error_rate": 0.45, "latency_p99_ms": 15000})
            elif service_name == "order_service":
                base.update({"error_rate": 0.22, "latency_p99_ms": 9000})

        elif cls._scenario == "deployment_issue" and service_name == "api_gateway":
            base.update({"error_rate": 0.08, "latency_p99_ms": 3200})

        return base

    @classmethod
    def get_deployments(cls, service_name: str, hours: int = 2) -> list:
        if cls._scenario == "deployment_issue" and service_name == "api_gateway":
            return [{
                "service": service_name,
                "version": "v2.4.1",
                "previous_version": "v2.4.0",
                "deployed_at": (datetime.utcnow() - timedelta(minutes=23)).isoformat(),
                "deployed_by": "ci-pipeline",
                "status": "active"
            }]
        return []

    @classmethod
    def get_downstream_health(cls, service_name: str) -> dict:
        health_map = {
            "api_gateway": {
                "order_service": "healthy",
                "inventory_service": "healthy"
            },
            "order_service": {
                "inventory_service": "degraded" if cls._scenario == "cascade_failure" else "healthy"
            },
            "inventory_service": {}
        }
        return health_map.get(service_name, {})

    @classmethod
    def get_correlated_alerts(cls, service_name: str, time_window_minutes: int = 15) -> list:
        if cls._scenario == "cascade_failure":
            return [
                {
                    "service": "inventory_service",
                    "alert": "high_error_rate",
                    "fired_at": (datetime.utcnow() - timedelta(minutes=8)).isoformat()
                },
                {
                    "service": "order_service",
                    "alert": "latency_spike",
                    "fired_at": (datetime.utcnow() - timedelta(minutes=6)).isoformat()
                }
            ]
        return []

    @classmethod
    def restart_service(cls, service_name: str, reason: str) -> dict:
        time.sleep(0.5)
        cls._scenario = "normal"
        return {
            "status": "success",
            "service": service_name,
            "duration_seconds": 12,
            "reason": reason
        }

    @classmethod
    def scale_service(cls, service_name: str, replica_count: int, reason: str) -> dict:
        return {
            "status": "success",
            "service": service_name,
            "replicas": replica_count,
            "reason": reason
        }

    @classmethod
    def rollback_deployment(cls, service_name: str, target_version: str, reason: str) -> dict:
        cls._scenario = "normal"
        return {
            "status": "success",
            "service": service_name,
            "rolled_back_to": target_version,
            "duration_seconds": 45
        }
