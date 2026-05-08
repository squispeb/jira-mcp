type RequiredEnv = {
  JIRA_MCP_URL: string;
  MCP_WORKSPACE_TOKEN: string;
};

async function main() {
  const env = readRequiredEnv();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.MCP_WORKSPACE_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const initializeResponse = await fetch(env.JIRA_MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "mcp-session-debug",
          version: "1.0.0",
        },
      },
    }),
  });

  const sessionId = initializeResponse.headers.get("mcp-session-id");
  const initializeBody = await initializeResponse.text();
  assertOk(initializeResponse, "initialize", initializeBody);
  if (!sessionId) {
    throw new Error("Missing mcp-session-id header from initialize response");
  }

  const sessionHeaders = {
    ...headers,
    "MCP-Session-Id": sessionId,
    "MCP-Protocol-Version": "2025-06-18",
  };

  const baseUrl = env.JIRA_MCP_URL.replace(/\/mcp$/, "");
  const workerDebugResponse = await fetch(`${baseUrl}/debug/session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.MCP_WORKSPACE_TOKEN}`,
      "MCP-Session-Id": sessionId,
    },
  });
  const workerDebugBody = await workerDebugResponse.text();
  assertOk(workerDebugResponse, "debug/session", workerDebugBody);

  const mcpDebugResponse = await fetch(env.JIRA_MCP_URL, {
    method: "GET",
    headers: {
      ...sessionHeaders,
      "x-debug-session": "1",
    },
  });
  const mcpDebugBody = await mcpDebugResponse.text();
  assertOk(mcpDebugResponse, "mcp debug", mcpDebugBody);

  const restartDebugResponse = await fetch(`${baseUrl}/debug/session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.MCP_WORKSPACE_TOKEN}`,
      "MCP-Session-Id": sessionId,
      "x-debug-session": "1",
      "x-debug-reset": "1",
    },
  });
  const restartDebugBody = await restartDebugResponse.text();
  assertOk(restartDebugResponse, "debug/session reset", restartDebugBody);

  console.log("Session debug passed");
  console.log(`Session ID: ${sessionId}`);
  console.log(`Worker debug: ${workerDebugBody}`);
  console.log(`MCP debug: ${mcpDebugBody}`);
  console.log(`Restart debug: ${restartDebugBody}`);
}

function readRequiredEnv(): RequiredEnv {
  const required = ["JIRA_MCP_URL"] as const;

  const missing = required.filter((name) => !process.env[name] || !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const workspaceToken =
    process.env.MCP_WORKSPACE_TOKEN?.trim() || process.env.MCP_AUTH_TOKEN?.trim();
  if (!workspaceToken) {
    throw new Error("Missing required environment variable: MCP_WORKSPACE_TOKEN");
  }

  return {
    JIRA_MCP_URL: process.env.JIRA_MCP_URL?.trim() || "http://127.0.0.1:8787/mcp",
    MCP_WORKSPACE_TOKEN: workspaceToken,
  };
}

function assertOk(response: Response, step: string, responseBody: string) {
  if (!response.ok) {
    throw new Error(`${step} failed with ${response.status}: ${responseBody}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
