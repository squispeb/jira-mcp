import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthTokenInfo, createToken, listTokens, revokeToken } from "../lib/api";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const { isAuthenticated, signIn, userEmail, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenName, setTokenName] = useState("ui-session");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [neverExpires, setNeverExpires] = useState(false);
  const [token, setToken] = useState("");
  const [tokens, setTokens] = useState<AuthTokenInfo[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const refreshTokens = useCallback(async () => {
    const response = await listTokens();
    setTokens(response.tokens);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setTokens([]);
      return;
    }

    void refreshTokens();
  }, [isAuthenticated, refreshTokens]);

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      setInfo(`Signed in as ${email}`);
      setPassword("");
      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateToken() {
    setError("");
    setInfo("");

    if (!isAuthenticated) {
      setError("Sign in first to create API tokens.");
      return;
    }

    try {
      const response = await createToken(undefined, tokenName, expiresInDays, neverExpires);
      setToken(response.token);
      setInfo(
        `New token created. ${response.expiresAt ? `Expires ${response.expiresAt}` : "No expiry"}`,
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
      <h2>Session and API Tokens</h2>
      <p className="description">
        Sign in with better-auth session cookies, then issue bearer tokens for MCP calls.
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
              <button type="button" onClick={onCreateToken}>
                Create API Token
              </button>
              <button type="button" className="secondary" onClick={() => void refreshTokens()}>
                Refresh Tokens
              </button>
              <button type="button" className="secondary" onClick={copyToken}>
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
                      Created: {entry.createdAt} | Expires: {entry.expiresAt || "never"} | Revoked:{" "}
                      {entry.revokedAt || "no"}
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
