export type LoginResponse = {
  token: string;
  tokenId: string;
  workspaceId: string | null;
  defaultProjectKey?: string | null;
  allowedTools?: string[] | null;
  tokenPrefix: string;
  expiresAt: string | null;
  user: {
    id: string;
    email: string;
  };
};

export type AuthTokenInfo = {
  id: string;
  workspaceId: string | null;
  workspaceName: string | null;
  defaultProjectKey?: string | null;
  allowedTools?: string[] | null;
  tokenName: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
};

export type ToolInfo = {
  name: string;
  description: string;
};

export const AVAILABLE_TOOLS: ToolInfo[] = [
  { name: "get_issue", description: "Get detailed information about a Jira issue" },
  {
    name: "search_issues",
    description: "Search Jira issues using JQL (supports filters, ordering, pagination)",
  },
  { name: "add_comment", description: "Add a comment to an existing Jira issue" },
  { name: "add_issue_labels", description: "Add one or more labels to an existing Jira issue" },
  {
    name: "remove_issue_labels",
    description: "Remove one or more labels from an existing Jira issue",
  },
  {
    name: "transition_issue",
    description: "Move an issue to a different status by applying a workflow transition",
  },
  {
    name: "get_issue_transitions",
    description: "List available workflow transitions for an issue",
  },
  { name: "get_epics", description: "Get epics from a Jira project" },
  { name: "get_epic_children", description: "Get child issues of a specific epic" },
  {
    name: "get_assigned_issues",
    description: "Get issues assigned to the current user in a project",
  },
  {
    name: "get_pending_assigned_issues",
    description: "Get issues assigned to the current user that are not done",
  },
  { name: "get_issues_by_type", description: "Get issues of a specific type" },
  { name: "get_projects", description: "Get list of available Jira projects" },
  { name: "get_issue_types", description: "Get list of available Jira issue types" },
  { name: "create_epic", description: "Create a new epic in a Jira project" },
  { name: "create_issue_with_parent", description: "Create a new issue linked to a parent epic" },
  { name: "set_parent_issue", description: "Set the parent of an issue" },
  {
    name: "update_issue_description",
    description: "Replace the description and optionally set labels on an existing Jira issue",
  },
  { name: "assign_issue", description: "Assign a Jira issue to a workspace member" },
  { name: "search_users", description: "Search for users in the Jira workspace" },
  { name: "get_link_types", description: "Get all available issue link types" },
  { name: "link_issues", description: "Create a link between two issues" },
  { name: "create_sprint", description: "Create a new sprint for a board" },
  { name: "get_sprint", description: "Get details for a specific sprint" },
  {
    name: "get_project_sprint",
    description: "Get sprint details and validate it belongs to a project",
  },
  { name: "add_issues_to_sprint", description: "Add issues to a sprint" },
  {
    name: "remove_issues_from_sprint",
    description: "Move issues out of a sprint back to the backlog",
  },
  { name: "start_sprint", description: "Start a sprint by setting state to active" },
  { name: "complete_sprint", description: "Complete a sprint by setting state to closed" },
  { name: "get_sprint_issues", description: "Get issues for a specific sprint" },
  { name: "get_board_issues", description: "Get all issues from a specific board" },
  { name: "get_board_sprints", description: "Get all sprints from a specific board" },
  { name: "get_project_sprints", description: "Get sprints for all boards in a project" },
  {
    name: "move_issues_to_board",
    description: "Move issues from backlog to a board or rank them on the board",
  },
  {
    name: "get_board_details",
    description: "Get detailed configuration and metadata for a specific board",
  },
  { name: "get_board_backlog", description: "Get issues from a board's backlog" },
  {
    name: "search_confluence_pages",
    description: "Search Confluence pages by title, space, or status",
  },
  {
    name: "get_confluence_page",
    description: "Get detailed information about a Confluence page",
  },
  {
    name: "get_confluence_page_ancestors",
    description: "Get ancestor pages in the Confluence page hierarchy",
  },
  {
    name: "get_confluence_page_children",
    description: "Get direct child pages of a Confluence page",
  },
  { name: "create_confluence_page", description: "Create a new Confluence page" },
  { name: "update_confluence_page", description: "Update an existing Confluence page" },
  {
    name: "link_confluence_page_to_jira_issue",
    description: "Generate a Confluence page web URL for pasting into a Jira issue",
  },
  {
    name: "link_confluence_page_to_issue",
    description: "Link a Confluence page to a Jira issue (appears in Linked work items panel)",
  },
  {
    name: "find_confluence_pages_for_issue",
    description: "Search Confluence pages that mention a Jira issue key",
  },
  {
    name: "get_confluence_spaces",
    description: "List Confluence spaces and resolve space keys to IDs",
  },
  {
    name: "map_jira_project_to_confluence_space",
    description: "Map a Jira project key to the matching Confluence space",
  },
  {
    name: "search_confluence_pages_cql",
    description:
      "Advanced search using Confluence CQL (supports wildcards, space filters, type filters)",
  },
  { name: "delete_confluence_page", description: "Move a Confluence page to the trash" },
];

export type McpResult = {
  sessionId?: string;
  payload: unknown;
};

export type JiraWorkspaceInfo = {
  id: string;
  workspaceName: string;
  jiraBaseUrl: string;
  jiraUsername: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

type HttpMethod = "GET" | "POST" | "PUT";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function registerUser(email: string, password: string) {
  return request<{ userId: string; email: string; message: string }>("POST", "/auth/register", {
    email,
    password,
  });
}

export async function loginUser(
  email: string,
  password: string,
  tokenName: string,
  expiresInDays: number,
  neverExpires: boolean,
  defaultProjectKey?: string,
  allowedTools?: string[],
) {
  return request<LoginResponse>("POST", "/auth/login", {
    email,
    password,
    tokenName,
    expiresInDays,
    neverExpires,
    defaultProjectKey,
    allowedTools,
  });
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  return request<{ message?: string }>("POST", "/api/auth/request-password-reset", {
    email,
    redirectTo,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return request<{ message?: string }>("POST", "/api/auth/reset-password", {
    token,
    newPassword,
  });
}

export async function createToken(
  authToken: string | undefined,
  tokenName: string,
  expiresInDays: number,
  neverExpires: boolean,
  workspaceId?: string,
  defaultProjectKey?: string,
  allowedTools?: string[],
) {
  return requestWithOptionalAuth<LoginResponse>(authToken, "POST", "/auth/tokens", {
    tokenName,
    expiresInDays,
    neverExpires,
    workspaceId,
    defaultProjectKey,
    allowedTools,
  });
}

export async function listTokens(authToken?: string) {
  return requestWithOptionalAuth<{
    currentTokenId: string | null;
    tokens: AuthTokenInfo[];
  }>(authToken, "GET", "/auth/tokens");
}

export async function revokeToken(authToken: string | undefined, tokenId: string) {
  return requestWithOptionalAuth<{
    tokenId: string;
    revokedAt: string;
    alreadyRevoked: boolean;
  }>(authToken, "POST", "/auth/tokens/revoke", { tokenId });
}

export async function updateToken(
  authToken: string | undefined,
  tokenId: string,
  defaultProjectKey: string | null,
  allowedTools?: string[] | null,
) {
  return requestWithOptionalAuth<{
    tokenId: string;
    defaultProjectKey: string | null;
    allowedTools: string[] | null;
  }>(authToken, "PUT", `/auth/tokens/${tokenId}`, { defaultProjectKey, allowedTools });
}

export async function listWorkspaces(authToken?: string) {
  return requestWithOptionalAuth<{ workspaces: JiraWorkspaceInfo[] }>(
    authToken,
    "GET",
    "/auth/workspaces",
  );
}

export async function createWorkspace(
  workspaceName: string,
  jiraBaseUrl: string,
  jiraUsername: string,
  jiraApiToken: string,
  authToken?: string,
) {
  return requestWithOptionalAuth<{ workspace: JiraWorkspaceInfo }>(
    authToken,
    "POST",
    "/auth/workspaces",
    {
      workspaceName,
      jiraBaseUrl,
      jiraUsername,
      jiraApiToken,
    },
  );
}

export async function deleteWorkspace(workspaceId: string, authToken?: string) {
  return requestWithOptionalAuth<{
    workspaceId: string;
    deleted: boolean;
    revokedWorkspaceTokens: boolean;
  }>(authToken, "POST", "/auth/workspaces/delete", { workspaceId });
}

export async function listWorkspaceProjects(workspaceId: string, authToken?: string) {
  return requestWithOptionalAuth<{
    projects: Array<{ key: string; name: string; id: string }>;
  }>(authToken, "GET", `/auth/workspaces/${workspaceId}/projects`);
}

export async function initializeMcp(token: string): Promise<McpResult> {
  const response = await fetch(withBaseUrl("/mcp"), {
    method: "POST",
    headers: createMcpHeaders(token),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "auth-ui", version: "1.0.0" },
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Initialize failed (${response.status}): ${raw}`);
  }

  return {
    sessionId: response.headers.get("mcp-session-id") ?? undefined,
    payload: parseStreamableBody(raw),
  };
}

export async function listTools(token: string, sessionId: string): Promise<McpResult> {
  await sendMcp(token, sessionId, {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  });

  const response = await sendMcp(token, sessionId, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });

  return {
    sessionId,
    payload: parseStreamableBody(response),
  };
}

export async function getProjects(token: string, sessionId: string): Promise<McpResult> {
  const response = await sendMcp(token, sessionId, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_projects",
      arguments: {},
    },
  });

  return {
    sessionId,
    payload: parseStreamableBody(response),
  };
}

function createMcpHeaders(token: string, sessionId?: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (sessionId) {
    headers["MCP-Session-Id"] = sessionId;
    headers["MCP-Protocol-Version"] = "2025-11-25";
  }

  return headers;
}

async function sendMcp(token: string, sessionId: string, body: unknown): Promise<string> {
  const response = await fetch(withBaseUrl("/mcp"), {
    method: "POST",
    headers: createMcpHeaders(token, sessionId),
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`MCP request failed (${response.status}): ${raw}`);
  }

  return raw;
}

function parseStreamableBody(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return { raw };
    }
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (lines.length === 0) {
    return { raw };
  }

  const lastLine = lines[lines.length - 1];
  try {
    return JSON.parse(lastLine);
  } catch {
    return { raw };
  }
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const response = await fetch(withBaseUrl(path), {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

async function requestWithOptionalAuth<T>(
  authToken: string | undefined,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken?.trim()) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(withBaseUrl(path), {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function withBaseUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }

  const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${normalizedBase}${path}`;
}
