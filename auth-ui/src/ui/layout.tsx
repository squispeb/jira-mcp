import { NavLink, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="page">
      <header className="hero">
        <h1>Jira MCP Auth Console</h1>
        <p>React UI for register, login, token handling, and MCP tool checks.</p>
      </header>

      <nav className="tabs" aria-label="Auth navigation">
        <NavLink to="/register" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Register
        </NavLink>
        <NavLink to="/login" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Login
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
