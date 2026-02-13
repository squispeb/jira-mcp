import { useEffect, useState } from "react";
import { getProjects, initializeMcp, listTools } from "../lib/api";
import { clearSessionId, getSessionId, setSessionId } from "../lib/storage";

export function McpTestPage() {
  const [token, setToken] = useState("");
  const [sessionId, setSessionIdState] = useState("");
  const [output, setOutput] = useState("Ready");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSessionIdState(getSessionId());
  }, []);

  function ensureRequired(): boolean {
    if (!token.trim()) {
      setError("Missing workspace token. Create one from the Token page.");
      return false;
    }

    setError("");
    return true;
  }

  async function runInitialize() {
    if (!ensureRequired()) {
      return;
    }

    const result = await initializeMcp(token);

    if (!result.sessionId) {
      throw new Error("Initialize succeeded but no MCP session ID was returned.");
    }

    setSessionId(result.sessionId);
    setSessionIdState(result.sessionId);
    setStatus(`Session created: ${result.sessionId}`);
    setOutput(JSON.stringify(result.payload, null, 2));
  }

  async function runListTools() {
    if (!ensureRequired()) {
      return;
    }
    if (!sessionId.trim()) {
      setError("Initialize first to create a session.");
      return;
    }

    const result = await listTools(token, sessionId);
    setStatus(`Tools listed using session ${result.sessionId}`);
    setOutput(JSON.stringify(result.payload, null, 2));
  }

  async function runGetProjects() {
    if (!ensureRequired()) {
      return;
    }
    if (!sessionId.trim()) {
      setError("Initialize first to create a session.");
      return;
    }

    const result = await getProjects(token, sessionId);
    setStatus(`Project data fetched using session ${result.sessionId}`);
    setOutput(JSON.stringify(result.payload, null, 2));
  }

  async function runAction(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  }

  function resetSession() {
    clearSessionId();
    setSessionIdState("");
    setStatus("Session cleared");
  }

  return (
    <section>
      <h2>MCP Quick Test</h2>
      <p className="description">
        Use a workspace-scoped token only. Jira credentials are resolved server-side from workspace
        settings.
      </p>

      <div className="form">
        <label htmlFor="mcp-token">Workspace bearer token</label>
        <input
          id="mcp-token"
          className="mono"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="mcp_..."
        />

        <label htmlFor="session-id">Session ID</label>
        <input id="session-id" className="mono" value={sessionId} readOnly />

        <div className="button-row">
          <button type="button" onClick={() => void runAction(runInitialize)}>
            Initialize
          </button>
          <button type="button" onClick={() => void runAction(runListTools)}>
            Tools List
          </button>
          <button type="button" onClick={() => void runAction(runGetProjects)}>
            Get Projects
          </button>
          <button type="button" className="secondary" onClick={resetSession}>
            Clear Session
          </button>
        </div>
      </div>

      {status ? <p className="status ok">{status}</p> : null}
      {error ? <p className="status err">{error}</p> : null}

      <pre>{output}</pre>
    </section>
  );
}
