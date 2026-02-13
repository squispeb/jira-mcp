import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function AuthLayout() {
  const { isAuthenticated, userEmail, logout, isLoading } = useAuth();

  async function onLogout() {
    try {
      await logout();
    } catch {
      // no-op
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="panel">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <h1>Jira MCP Auth Console</h1>
          <p>React UI for register, login, token handling, and MCP tool checks.</p>
        </div>
        {isAuthenticated && (
          <div className="user-info">
            <span className="user-email">{userEmail}</span>
            <button type="button" className="logout-btn" onClick={() => void onLogout()}>
              Logout
            </button>
          </div>
        )}
      </header>

      <nav className="tabs" aria-label="Auth navigation">
        <NavLink to="/sign-up" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Sign Up
        </NavLink>
        <NavLink to="/token" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Token
        </NavLink>
        <NavLink to="/mcp-test" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          MCP Test
        </NavLink>
      </nav>

      <main className="panel">
        <Outlet />
      </main>
    </div>
  );
}
