const SESSION_KEY = "jira-mcp.auth.session-id";
const AUTH_EMAIL_KEY = "jira-mcp.auth.email";

export function getSessionId(): string {
  return localStorage.getItem(SESSION_KEY) || "";
}

export function setSessionId(value: string) {
  localStorage.setItem(SESSION_KEY, value);
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}

export function getAuthEmail(): string {
  return localStorage.getItem(AUTH_EMAIL_KEY) || "";
}

export function setAuthEmail(value: string) {
  const email = value.trim();
  if (!email) {
    localStorage.removeItem(AUTH_EMAIL_KEY);
    return;
  }

  localStorage.setItem(AUTH_EMAIL_KEY, email);
}

export function clearAuthEmail() {
  localStorage.removeItem(AUTH_EMAIL_KEY);
}
