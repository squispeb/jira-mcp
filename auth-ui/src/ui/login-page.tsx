import { FormEvent, useEffect, useState } from "react";
import { loginUser } from "../lib/api";
import { getToken, setToken } from "../lib/storage";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenName, setTokenName] = useState("ui-session");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [token, setTokenState] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      const response = await loginUser(email, password, tokenName, expiresInDays);
      setToken(response.token);
      setTokenState(response.token);
      setInfo(`Token issued for ${response.user.email}. Expires ${response.expiresAt}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login.");
    } finally {
      setIsLoading(false);
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
          min={1}
          max={365}
          value={expiresInDays}
          onChange={(event) => setExpiresInDays(Number(event.target.value || 30))}
        />

        <div className="button-row">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login + Create Token"}
          </button>
          <button type="button" className="secondary" onClick={copyToken}>
            Copy Token
          </button>
        </div>
      </form>

      <label htmlFor="token-output">Current token</label>
      <input id="token-output" value={token} readOnly className="mono" />

      {info ? <p className="status ok">{info}</p> : null}
      {error ? <p className="status err">{error}</p> : null}
    </section>
  );
}
