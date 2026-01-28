import type {
  AtlassianAccessibleResource,
  AtlassianOAuthConfig,
} from "./atlassian";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  fetchAccessibleResources,
  refreshAccessToken,
} from "./atlassian";
import type { JiraOAuthClientRecord } from "./store";
import { JiraOAuthStore } from "./store";

export type JiraOAuthSession = {
  accessToken: string;
  resource: AtlassianAccessibleResource;
};

const REFRESH_BUFFER_MS = 60 * 1000;

export class JiraOAuthManager {
  constructor(
    private readonly config: AtlassianOAuthConfig,
    private readonly store: JiraOAuthStore,
  ) {}

  createAuthorizationUrl(state: string): string {
    return buildAuthorizationUrl(this.config, state);
  }

  async handleAuthorizationCode(
    clientToken: string,
    code: string,
  ): Promise<JiraOAuthClientRecord> {
    const tokenResponse = await exchangeAuthorizationCode(this.config, code);
    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token ?? "";
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    const resources = await fetchAccessibleResources(accessToken);

    const record: JiraOAuthClientRecord = {
      accessToken,
      refreshToken,
      expiresAt,
      resources,
      selectedResourceId: resources.length === 1 ? resources[0].id : undefined,
    };

    this.store.setClient(clientToken, record);
    return record;
  }

  getResources(clientToken: string): AtlassianAccessibleResource[] {
    return this.store.getClient(clientToken)?.resources ?? [];
  }

  selectResource(clientToken: string, resourceId: string): boolean {
    const record = this.store.getClient(clientToken);
    if (!record) {
      return false;
    }

    const exists = record.resources.some(
      (resource) => resource.id === resourceId,
    );
    if (!exists) {
      return false;
    }

    this.store.setClient(clientToken, {
      ...record,
      selectedResourceId: resourceId,
    });
    return true;
  }

  async getSession(
    clientToken: string,
    resourceId?: string,
  ): Promise<JiraOAuthSession | null> {
    const record = this.store.getClient(clientToken);
    if (!record) {
      return null;
    }

    const targetResourceId = resourceId ?? record.selectedResourceId;
    if (!targetResourceId) {
      return null;
    }

    const resource = record.resources.find(
      (item) => item.id === targetResourceId,
    );
    if (!resource) {
      return null;
    }

    if (this.needsRefresh(record)) {
      if (!record.refreshToken) {
        return null;
      }

      const refreshed = await refreshAccessToken(
        this.config,
        record.refreshToken,
      );
      const nextAccessToken = refreshed.access_token;
      const nextRefreshToken = refreshed.refresh_token ?? record.refreshToken;
      const nextExpiresAt = Date.now() + refreshed.expires_in * 1000;

      this.store.setClient(clientToken, {
        ...record,
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        expiresAt: nextExpiresAt,
      });

      return {
        accessToken: nextAccessToken,
        resource,
      };
    }

    return {
      accessToken: record.accessToken,
      resource,
    };
  }

  private needsRefresh(record: JiraOAuthClientRecord): boolean {
    return Date.now() >= record.expiresAt - REFRESH_BUFFER_MS;
  }
}
