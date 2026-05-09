import {
  ConfluencePage,
  ConfluencePageAncestorsResponse,
  ConfluencePageChildrenResponse,
  ConfluencePageCreateRequest,
  ConfluencePageSearchResponse,
  ConfluencePageUpdateRequest,
  ConfluenceSearchParams,
} from "~/types/confluence";

export type ConfluenceLogSink = (name: string, value: unknown) => Promise<void> | void;

export class ConfluenceService {
  private readonly baseUrl: string;
  private readonly auth: {
    username: string;
    password: string;
  };
  private readonly logSink?: ConfluenceLogSink;

  constructor(baseUrl: string, username: string, apiToken: string, logSink?: ConfluenceLogSink) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.auth = {
      username,
      password: apiToken,
    };
    this.logSink = logSink;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" = "GET",
    data?: unknown,
  ): Promise<T> {
    try {
      console.log(`Calling ${this.baseUrl}${endpoint}`);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${toBase64(`${this.auth.username}:${this.auth.password}`)}`,
        },
        ...(method === "POST" || method === "PUT" ? { body: JSON.stringify(data) } : {}),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        throw {
          status: response.status,
          err: formatConfluenceErrorMessage(errorBody, response.statusText),
        } as ConfluenceError;
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (isConfluenceError(error)) {
        throw error;
      }
      throw new Error(
        `Failed to make request to Confluence API: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async writeLog(name: string, value: unknown): Promise<void> {
    if (!this.logSink) {
      return;
    }
    await this.logSink(name, value);
  }

  async searchPages(params: ConfluenceSearchParams = {}): Promise<ConfluencePageSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.title) {
      queryParams.append("title", params.title);
    }
    if (params.spaceId) {
      queryParams.append("spaceId", params.spaceId);
    }
    if (params.status) {
      queryParams.append("status", params.status);
    } else {
      queryParams.append("status", "current");
    }
    if (params.limit) {
      queryParams.append("limit", String(params.limit));
    } else {
      queryParams.append("limit", "25");
    }

    const endpoint = `/wiki/api/v2/pages?${queryParams.toString()}`;
    const response = await this.request<ConfluencePageSearchResponse>(endpoint);
    await this.writeLog(`confluence-search-${new Date().toISOString()}.json`, response);
    return response;
  }

  async getPage(
    pageId: string,
    bodyFormat: "storage" | "atlas_doc_format" | "view" = "storage",
  ): Promise<ConfluencePage> {
    const endpoint = `/wiki/api/v2/pages/${pageId}?body-format=${bodyFormat}`;
    const response = await this.request<ConfluencePage>(endpoint);
    await this.writeLog(`confluence-page-${pageId}.json`, response);
    return response;
  }

  async getPageAncestors(pageId: string): Promise<ConfluencePageAncestorsResponse> {
    const endpoint = `/wiki/api/v2/pages/${pageId}/ancestors`;
    const response = await this.request<ConfluencePageAncestorsResponse>(endpoint);
    await this.writeLog(`confluence-page-${pageId}-ancestors.json`, response);
    return response;
  }

  async getPageChildren(
    pageId: string,
    limit: number = 25,
  ): Promise<ConfluencePageChildrenResponse> {
    const endpoint = `/wiki/api/v2/pages/${pageId}/direct-children?limit=${limit}`;
    const response = await this.request<ConfluencePageChildrenResponse>(endpoint);
    await this.writeLog(`confluence-page-${pageId}-children.json`, response);
    return response;
  }

  async createPage(params: {
    spaceId: string;
    title: string;
    body: string;
    representation?: "storage" | "atlas_doc_format";
    parentId?: string;
    status?: "current" | "draft";
  }): Promise<ConfluencePage> {
    const payload: ConfluencePageCreateRequest = {
      spaceId: params.spaceId,
      title: params.title,
      body: {
        representation: params.representation ?? "storage",
        value: params.body,
      },
      parentId: params.parentId,
      status: params.status ?? "current",
    };

    const endpoint = `/wiki/api/v2/pages`;
    const response = await this.request<ConfluencePage>(endpoint, "POST", payload);
    await this.writeLog(`confluence-create-page-${response.id}.json`, response);
    return response;
  }

  async updatePage(params: {
    id: string;
    title: string;
    body: string;
    version: number;
    representation?: "storage" | "atlas_doc_format";
    status?: "current" | "draft";
  }): Promise<ConfluencePage> {
    const payload: ConfluencePageUpdateRequest = {
      id: params.id,
      title: params.title,
      body: {
        representation: params.representation ?? "storage",
        value: params.body,
      },
      version: {
        number: params.version,
        message: "Updated via MCP",
      },
      status: params.status ?? "current",
    };

    const endpoint = `/wiki/api/v2/pages/${params.id}`;
    const response = await this.request<ConfluencePage>(endpoint, "PUT", payload);
    await this.writeLog(`confluence-update-page-${response.id}.json`, response);
    return response;
  }

  async findPagesLinkedToIssue(issueKey: string): Promise<ConfluencePageSearchResponse> {
    return this.searchPages({ title: issueKey });
  }

  getPageWebUrl(baseUrl: string, page: ConfluencePage): string {
    if (page._links?.webui) {
      return `${baseUrl}${page._links.webui}`;
    }
    if (page._links?.tinyui) {
      return `${baseUrl}${page._links.tinyui}`;
    }
    return `${baseUrl}/wiki/spaces/~space/pages/${page.id}`;
  }
}

interface ConfluenceError {
  status: number;
  err: string;
}

interface ConfluenceErrorBody {
  message?: unknown;
  data?: {
    errors?: unknown;
    errorMessages?: unknown;
  };
}

function toBase64(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }
  return Buffer.from(value, "utf8").toString("base64");
}

function formatConfluenceErrorMessage(errorBody: unknown, statusText: string): string {
  const parsed = isConfluenceErrorBody(errorBody) ? errorBody : undefined;

  const topLevelMessages = Array.isArray(parsed?.data?.errorMessages)
    ? parsed.data.errorMessages.filter(isNonEmptyString)
    : [];

  const fieldMessages = isStringRecord(parsed?.data?.errors)
    ? Object.entries(parsed.data.errors)
        .filter(([, message]) => isNonEmptyString(message))
        .map(([field, message]) => `${field}: ${message}`)
    : [];

  if (topLevelMessages.length > 0 || fieldMessages.length > 0) {
    return [...topLevelMessages, ...fieldMessages].join(" | ");
  }

  if (isNonEmptyString(parsed?.message)) {
    return parsed.message;
  }

  if (isNonEmptyString(errorBody)) {
    return errorBody;
  }

  return statusText || "Unknown error";
}

function isConfluenceErrorBody(value: unknown): value is ConfluenceErrorBody {
  return !!value && typeof value === "object";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.values(value).every((v) => typeof v === "string");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isConfluenceError(value: unknown): value is ConfluenceError {
  if (!value || typeof value !== "object") {
    return false;
  }
  const maybeError = value as { status?: unknown; err?: unknown };
  return typeof maybeError.status === "number" && typeof maybeError.err === "string";
}
