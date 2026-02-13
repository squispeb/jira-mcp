import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AuthTokenInfo,
  JiraWorkspaceInfo,
  createToken,
  createWorkspace,
  deleteWorkspace,
  listTokens,
  listWorkspaces,
  revokeToken,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const { isAuthenticated, signIn, userEmail, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenName, setTokenName] = useState("workspace-token");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [neverExpires, setNeverExpires] = useState(false);
  const [token, setToken] = useState("");
  const [tokens, setTokens] = useState<AuthTokenInfo[]>([]);
  const [workspaces, setWorkspaces] = useState<JiraWorkspaceInfo[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceBaseUrl, setWorkspaceBaseUrl] = useState("");
  const [workspaceUsername, setWorkspaceUsername] = useState("");
  const [workspaceApiToken, setWorkspaceApiToken] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const selectedWorkspace = useMemo(
    () => workspaces.find((entry) => entry.id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId],
  );

  const refreshTokens = useCallback(async () => {
    const response = await listTokens();
    setTokens(response.tokens);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const response = await listWorkspaces();
    setWorkspaces(response.workspaces);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setTokens([]);
      setWorkspaces([]);
      return;
    }

    void Promise.all([refreshTokens(), refreshWorkspaces()]);
  }, [isAuthenticated, refreshTokens, refreshWorkspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      return;
    }

    const exists = workspaces.some((entry) => entry.id === selectedWorkspaceId);
    if (!exists) {
      setSelectedWorkspaceId("");
    }
  }, [workspaces, selectedWorkspaceId]);

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      setInfo(`Signed in as ${email}`);
      setPassword("");
      await Promise.all([refreshTokens(), refreshWorkspaces()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateWorkspace() {
    setError("");
    setInfo("");

    if (!isAuthenticated) {
      setError("Sign in first to create workspaces.");
      return;
    }

    try {
      const result = await createWorkspace(
        workspaceName,
        workspaceBaseUrl,
        workspaceUsername,
        workspaceApiToken,
      );
      setWorkspaceApiToken("");
      setSelectedWorkspaceId(result.workspace.id);
      setInfo(`Workspace "${result.workspace.workspaceName}" created.`);
      await refreshWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace.");
    }
  }

  async function onDeleteWorkspace() {
    if (!selectedWorkspace) {
      setError("Select a workspace first.");
      return;
    }

    setError("");
    setInfo("");

    try {
      await deleteWorkspace(selectedWorkspace.id);
      setSelectedWorkspaceId("");
      setInfo(`Workspace "${selectedWorkspace.workspaceName}" deleted.`);
      await Promise.all([refreshWorkspaces(), refreshTokens()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace.");
    }
  }

  async function onCreateToken() {
    setError("");
    setInfo("");

    if (!isAuthenticated) {
      setError("Sign in first to create API tokens.");
      return;
    }

    if (!selectedWorkspaceId) {
      setError("Select a workspace before issuing a token.");
      return;
    }

    try {
      const response = await createToken(
        undefined,
        tokenName,
        expiresInDays,
        neverExpires,
        selectedWorkspaceId,
      );
      setToken(response.token);
      setInfo(
        `Workspace token created. ${response.expiresAt ? `Expires ${response.expiresAt}` : "No expiry"}`,
      );
      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token.");
    }
  }

  async function onRevoke(tokenId: string) {
    setError("");
    setInfo("");

    try {
      await revokeToken(undefined, tokenId);
      setInfo(`Revoked token ${tokenId}`);
      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token.");
    }
  }

  async function copyToken() {
    if (!token) {
      setError("No token available to copy.");
      return;
    }

    await navigator.clipboard.writeText(token);
    setInfo("Token copied to clipboard.");
    setError("");
  }

  if (authLoading) {
    return <section>Loading session...</section>;
  }

  return (
    <section>
      <h2>Workspaces and API Tokens</h2>
      <p className="description">
        Create Jira workspaces once, then issue scoped MCP tokens without passing Jira headers.
      </p>

      {!isAuthenticated ? (
        <form className="form" onSubmit={onSignIn}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="button-row">
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="description">Signed in as {userEmail}.</p>

          <h3>Jira Workspaces</h3>
          <div className="form">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Acme Production"
            />

            <label htmlFor="workspace-url">Jira base URL</label>
            <input
              id="workspace-url"
              value={workspaceBaseUrl}
              onChange={(event) => setWorkspaceBaseUrl(event.target.value)}
              placeholder="https://your-domain.atlassian.net"
            />

            <label htmlFor="workspace-user">Jira username</label>
            <input
              id="workspace-user"
              value={workspaceUsername}
              onChange={(event) => setWorkspaceUsername(event.target.value)}
              placeholder="your-email@example.com"
            />

            <label htmlFor="workspace-token">Jira API token</label>
            <input
              id="workspace-token"
              type="password"
              value={workspaceApiToken}
              onChange={(event) => setWorkspaceApiToken(event.target.value)}
              placeholder="Paste Jira API token"
            />

            <div className="button-row">
              <button type="button" onClick={() => void onCreateWorkspace()}>
                Save Workspace
              </button>
              <button type="button" className="secondary" onClick={() => void refreshWorkspaces()}>
                Refresh Workspaces
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!selectedWorkspace}
                onClick={() => void onDeleteWorkspace()}
              >
                Delete Workspace
              </button>
            </div>
          </div>

          <label htmlFor="workspace-select">Selected workspace</label>
          <select
            id="workspace-select"
            value={selectedWorkspaceId}
            onChange={(event) => setSelectedWorkspaceId(event.target.value)}
          >
            <option value="">Choose workspace...</option>
            {workspaces.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.workspaceName} ({entry.jiraUsername})
              </option>
            ))}
          </select>

          <h3>Issue Workspace Token</h3>
          <div className="form">
            <label htmlFor="token-name">Token name</label>
            <input
              id="token-name"
              type="text"
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
            />

            <label htmlFor="token-days">Expires in days</label>
            <input
              id="token-days"
              type="number"
              min={0}
              max={365}
              disabled={neverExpires}
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(Number(event.target.value || 30))}
            />

            <label htmlFor="never-expires">
              <input
                id="never-expires"
                type="checkbox"
                checked={neverExpires}
                onChange={(event) => setNeverExpires(event.target.checked)}
              />{" "}
              Never expires
            </label>

            <div className="button-row">
              <button type="button" onClick={() => void onCreateToken()}>
                Create Workspace Token
              </button>
              <button type="button" className="secondary" onClick={() => void refreshTokens()}>
                Refresh Tokens
              </button>
              <button type="button" className="secondary" onClick={() => void copyToken()}>
                Copy Token
              </button>
            </div>
          </div>

          <label htmlFor="token-output">Latest token</label>
          <div className="token-display">
            <input
              id="token-output"
              type={showToken ? "text" : "password"}
              value={token}
              readOnly
              className="mono"
            />
            <button
              type="button"
              className="secondary toggle-btn"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>

          {tokens.length > 0 ? (
            <>
              <h3>Issued Tokens</h3>
              <div className="token-list">
                {tokens.map((entry) => (
                  <div key={entry.id} className="token-item">
                    <div>
                      <strong>{entry.tokenName}</strong> ({entry.tokenPrefix})
                    </div>
                    <div className="token-meta">
                      Workspace: {entry.workspaceName || "(unscoped)"} | Created: {entry.createdAt}{" "}
                      | Expires: {entry.expiresAt || "never"} | Revoked: {entry.revokedAt || "no"}
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary"
                        disabled={entry.revokedAt !== null}
                        onClick={() => void onRevoke(entry.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      {info ? <p className="status ok">{info}</p> : null}
      {error ? <p className="status err">{error}</p> : null}
    </section>
  );
}
