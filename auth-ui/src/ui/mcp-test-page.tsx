import { useEffect, useState } from "react";
import { getProjects, initializeMcp, listTools } from "../lib/api";
import {
  clearSessionId,
  getJiraBaseUrl,
  getJiraUsername,
  getSessionId,
  setJiraBaseUrl,
  setJiraUsername,
  setSessionId,
} from "../lib/storage";

export function McpTestPage() {
  const [token, setToken] = useState("");
  const [jiraBaseUrl, setJiraBaseUrlState] = useState("");
  const [jiraUsername, setJiraUsernameState] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [sessionId, setSessionIdState] = useState("");
  const [output, setOutput] = useState("Ready");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setJiraBaseUrlState(getJiraBaseUrl());
    setJiraUsernameState(getJiraUsername());
    setSessionIdState(getSessionId());
  }, []);

  function handleJiraBaseUrlChange(value: string) {
    setJiraBaseUrlState(value);
    setJiraBaseUrl(value);
  }

  function handleJiraUsernameChange(value: string) {
    setJiraUsernameState(value);
    setJiraUsername(value);
  }

  function ensureRequired(): boolean {
    if (!token.trim()) {
      setError("Missing bearer token. Login first.");
      return false;
    }

    if (!jiraBaseUrl.trim() || !jiraUsername.trim() || !jiraApiToken.trim()) {
      setError("Fill Jira base URL, username, and API token.");
      return false;
    }

    setError("");
    return true;
  }

  async function runInitialize() {
    if (!ensureRequired()) {
      return;
    }

    const result = await initializeMcp(token, jiraBaseUrl, jiraUsername, jiraApiToken);

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

    const result = await listTools(token, jiraBaseUrl, jiraUsername, jiraApiToken, sessionId);
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

    const result = await getProjects(token, jiraBaseUrl, jiraUsername, jiraApiToken, sessionId);
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
        Uses your user token plus Jira headers to initialize MCP and execute core tool checks.
      </p>

      <div className="form">
        <label htmlFor="mcp-token">Bearer token</label>
        <input
          id="mcp-token"
          className="mono"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="mcp_..."
        />

        <label htmlFor="jira-base-url">Jira base URL</label>
        <input
          id="jira-base-url"
          value={jiraBaseUrl}
          onChange={(event) => handleJiraBaseUrlChange(event.target.value)}
          placeholder="https://your-domain.atlassian.net"
        />

        <label htmlFor="jira-username">Jira username</label>
        <input
          id="jira-username"
          value={jiraUsername}
          onChange={(event) => handleJiraUsernameChange(event.target.value)}
          placeholder="your-email@example.com"
        />

        <label htmlFor="jira-api-token">Jira API token</label>
        <input
          id="jira-api-token"
          type="password"
          value={jiraApiToken}
          onChange={(event) => setJiraApiToken(event.target.value)}
          placeholder="jira-api-token"
        />

        <label htmlFor="session-id">Session ID</label>
        <input id="session-id" className="mono" value={sessionId} readOnly />

        <div className="button-row">
          <button type="button" onClick={() => runAction(runInitialize)}>
            Initialize
          </button>
          <button type="button" onClick={() => runAction(runListTools)}>
            Tools List
          </button>
          <button type="button" onClick={() => runAction(runGetProjects)}>
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
