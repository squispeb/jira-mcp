import { FormEvent, useEffect, useState } from "react";
import { AuthTokenInfo, createToken, listTokens, loginUser, revokeToken } from "../lib/api";
import { getToken, setToken } from "../lib/storage";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenName, setTokenName] = useState("ui-session");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [neverExpires, setNeverExpires] = useState(false);
  const [token, setTokenState] = useState("");
  const [tokens, setTokens] = useState<AuthTokenInfo[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const persistedToken = getToken();
    setTokenState(persistedToken);
    if (persistedToken) {
      void listTokens(persistedToken)
        .then((response) => {
          setTokens(response.tokens);
        })
        .catch(() => {
          setTokens([]);
        });
    }
  }, []);

  async function refreshTokens(authToken = token) {
    if (!authToken) {
      setTokens([]);
      return;
    }

    const response = await listTokens(authToken);
    setTokens(response.tokens);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      const response = await loginUser(email, password, tokenName, expiresInDays, neverExpires);
      setToken(response.token);
      setTokenState(response.token);
      setInfo(
        `Token issued for ${response.user.email}. ${response.expiresAt ? `Expires ${response.expiresAt}` : "No expiry"}`,
      );
      await refreshTokens(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateToken() {
    setError("");
    setInfo("");

    if (!token) {
      setError("Login first to create additional tokens.");
      return;
    }

    try {
      const response = await createToken(token, tokenName, expiresInDays, neverExpires);
      setToken(response.token);
      setTokenState(response.token);
      setInfo(
        `New token created. ${response.expiresAt ? `Expires ${response.expiresAt}` : "No expiry"}`,
      );
      await refreshTokens(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token.");
    }
  }

  async function onRevoke(tokenId: string) {
    if (!token) {
      setError("Login first.");
      return;
    }

    try {
      await revokeToken(token, tokenId);
      setInfo(`Revoked token ${tokenId}`);
      await refreshTokens(token);
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

  return (
    <section>
      <h2>Login and Issue Token</h2>
      <p className="description">Use your user credentials to get a bearer token for MCP calls.</p>

      <form className="form" onSubmit={onSubmit}>
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
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login + Create Token"}
          </button>
          <button type="button" onClick={onCreateToken}>
            Create Extra Token
          </button>
          <button type="button" className="secondary" onClick={() => refreshTokens()}>
            Refresh Tokens
          </button>
          <button type="button" className="secondary" onClick={copyToken}>
            Copy Token
          </button>
        </div>
      </form>

      <label htmlFor="token-output">Current token</label>
      <input id="token-output" value={token} readOnly className="mono" />

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
                    onClick={() => onRevoke(entry.id)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {info ? <p className="status ok">{info}</p> : null}
      {error ? <p className="status err">{error}</p> : null}
    </section>
  );
}
