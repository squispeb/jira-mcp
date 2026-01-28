import axios from "axios";

export type AtlassianOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export type AtlassianTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export type AtlassianAccessibleResource = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
};

export const DEFAULT_ATLASSIAN_SCOPES = [
  "read:jira-user",
  "read:jira-work",
  "write:jira-work",
  "read:board-scope:jira-software",
  "read:sprint:jira-software",
  "write:sprint:jira-software",
  "offline_access",
];

export function buildAuthorizationUrl(
  config: AtlassianOAuthConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: config.clientId,
    scope: config.scopes.join(" "),
    redirect_uri: config.redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  config: AtlassianOAuthConfig,
  code: string,
): Promise<AtlassianTokenResponse> {
  const response = await axios.post<AtlassianTokenResponse>(
    "https://auth.atlassian.com/oauth/token",
    {
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
}

export async function refreshAccessToken(
  config: AtlassianOAuthConfig,
  refreshToken: string,
): Promise<AtlassianTokenResponse> {
  const response = await axios.post<AtlassianTokenResponse>(
    "https://auth.atlassian.com/oauth/token",
    {
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
}

export async function fetchAccessibleResources(
  accessToken: string,
): Promise<AtlassianAccessibleResource[]> {
  const response = await axios.get<AtlassianAccessibleResource[]>(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );
  return response.data;
}
