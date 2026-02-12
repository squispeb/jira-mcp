const TOKEN_KEY = "jira-mcp.auth.token";
const SESSION_KEY = "jira-mcp.auth.session-id";
const JIRA_BASE_URL_KEY = "jira-mcp.jira.base-url";
const JIRA_USERNAME_KEY = "jira-mcp.jira.username";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(value: string) {
  localStorage.setItem(TOKEN_KEY, value);
}

export function getSessionId(): string {
  return localStorage.getItem(SESSION_KEY) || "";
}

export function setSessionId(value: string) {
  localStorage.setItem(SESSION_KEY, value);
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY);
}

export function getJiraBaseUrl(): string {
  return localStorage.getItem(JIRA_BASE_URL_KEY) || "";
}

export function setJiraBaseUrl(value: string) {
  localStorage.setItem(JIRA_BASE_URL_KEY, value);
}

export function getJiraUsername(): string {
  return localStorage.getItem(JIRA_USERNAME_KEY) || "";
}

export function setJiraUsername(value: string) {
  localStorage.setItem(JIRA_USERNAME_KEY, value);
}
