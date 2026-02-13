import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth-context";

export function RegisterPage() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await signUp(name.trim() || email, email, password);
      setMessage(`Registered and signed in as ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register account.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section>
      <h2>Create User</h2>
      <p className="description">Creates a new account in Worker D1 auth storage.</p>

      <form className="form" onSubmit={onSubmit}>
        <label htmlFor="register-name">Display name</label>
        <input
          id="register-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jane Doe"
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>

      {message ? <p className="status ok">{message}</p> : null}
      {error ? <p className="status err">{error}</p> : null}
    </section>
  );
}
