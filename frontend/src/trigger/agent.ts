import { logger, task } from "@trigger.dev/sdk/v3";

interface AgentPayload {
  scenario: string;
  chatId: string;
}

// Calls the FastAPI backend to run an OpsGuard incident scenario.
// The Python backend path will be updated in Phase 6.
export const runAgentTask = task({
  id: "run-agent",
  maxDuration: 300,
  run: async (payload: AgentPayload) => {
    logger.log("Running agent", { chatId: payload.chatId });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const response = await fetch(`${apiUrl}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_name: payload.scenario }),
    });

    const result = await response.json();
    logger.log("Agent completed", { result });

    return result;
  },
});
