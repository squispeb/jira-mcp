import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { JiraMcpServer } from "~/server";
import { resolveInternalSigningSecret, verifyWorkerToDoRequestSignature } from "./security";

type JiraClientCredentials = {
  baseUrl: string;
  username: string;
  apiToken: string;
};

type WorkerEnv = {
  MCP_INTERNAL_SIGNING_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  MCP_AUTH_TOKEN?: string;
  MCP_AUTH_TOKENS?: string;
  JIRA_MCP_SESSIONS: unknown;
};

type DurableObjectStorageLike = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
};

type DurableObjectStateLike = {
  storage: DurableObjectStorageLike;
};

type JiraSessionEntry = {
  server: JiraMcpServer;
  transport: WebStandardStreamableHTTPServerTransport;
  authUserId?: string;
  authTokenId?: string;
  authWorkspaceId?: string;
};

type EncryptedValue = {
  ciphertext: string;
  iv: string;
};

type StoredSessionRecord = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  authUserId?: string;
  authTokenId?: string;
  authWorkspaceId?: string;
  jiraBaseUrl: EncryptedValue;
  jiraUsername: EncryptedValue;
  jiraApiToken: EncryptedValue;
};

const SESSION_STORAGE_PREFIX = "mcp-session:";
const SESSION_LEASE_MS = 24 * 60 * 60 * 1000;

let cachedSessionCryptoSecret = "";
let cachedSessionCryptoKey: Promise<CryptoKey> | null = null;

export class JiraMcpSessionDurableObject {
  private readonly sessions = new Map<string, JiraSessionEntry>();

  constructor(
    private readonly _state: DurableObjectStateLike,
    private readonly _env: WorkerEnv,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }

    return this.handleMcpRequest(request);
  }

  private async handleMcpRequest(request: Request): Promise<Response> {
    try {
      const signingSecret = resolveInternalSigningSecret(this._env);
      if (!signingSecret) {
        return createJsonRpcError(
          500,
          -32603,
          "Server misconfigured: missing internal signing secret",
        );
      }

      const isTrustedRequest = await verifyWorkerToDoRequestSignature(request, signingSecret);
      if (!isTrustedRequest) {
        return createJsonRpcError(401, -32002, "Unauthorized request");
      }

      const authUserId = request.headers.get("x-auth-user-id")?.trim() || undefined;
      const authTokenId = request.headers.get("x-auth-token-id")?.trim() || undefined;
      const authWorkspaceId = request.headers.get("x-auth-workspace-id")?.trim() || undefined;
      const parsedBody = await parseJsonBody(request);
      if (parsedBody.invalidJson) {
        return createJsonRpcError(400, -32700, "Parse error: request body must be valid JSON");
      }

      const body = parsedBody.value;
    const sessionId = getSessionIdFromRequest(request);

    if (request.method === "GET" && request.headers.get("x-debug-session") === "1") {
      const shouldReset = request.headers.get("x-debug-reset") === "1";
      if (shouldReset) {
        this.sessions.clear();
      }

      const record = sessionId ? await this.readSessionRecord(sessionId) : null;
      return Response.json(
        {
          sessionId: sessionId || null,
          resetApplied: shouldReset,
          inMemory: sessionId ? this.sessions.has(sessionId) : false,
          persisted: !!record,
          expired: record ? isSessionExpired(record) : false,
          authUserId: record?.authUserId || null,
          authTokenId: record?.authTokenId || null,
          authWorkspaceId: record?.authWorkspaceId || null,
        },
        { status: 200 },
      );
    }

    if (sessionId) {
        const existingSession = await this.getSessionEntry(sessionId, signingSecret);
        if (!existingSession) {
          return createJsonRpcError(
            404,
            -32001,
            "Unknown or expired session ID. Re-run initialize to create a new session.",
          );
        }

        if (existingSession.authUserId && existingSession.authUserId !== authUserId) {
          return createJsonRpcError(
            403,
            -32003,
            "Session belongs to a different authenticated user.",
          );
        }

        if (existingSession.authTokenId && existingSession.authTokenId !== authTokenId) {
          return createJsonRpcError(403, -32003, "Session belongs to a different auth token.");
        }

        if (
          existingSession.authWorkspaceId &&
          existingSession.authWorkspaceId !== authWorkspaceId
        ) {
          return createJsonRpcError(403, -32003, "Session belongs to a different workspace.");
        }

        await this.touchSession(sessionId);
        return existingSession.transport.handleRequest(request, {
          parsedBody: body,
        });
      }

      const isInit = request.method === "POST" && !!body && isInitializeRequest(body);
      if (!isInit) {
        return createJsonRpcError(
          400,
          -32000,
          "Bad Request: Send initialize first or include a valid MCP-Session-Id header.",
        );
      }

      const credentials = readJiraCredentials(request);
      if (!credentials) {
        return createJsonRpcError(
          400,
          -32000,
          "Missing Jira credentials. Provide X-Jira-Base-Url, X-Jira-Username, and X-Jira-Api-Token.",
        );
      }

      const server = new JiraMcpServer(
        credentials.baseUrl,
        credentials.username,
        credentials.apiToken,
      );

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: async (sid) => {
          const entry: JiraSessionEntry = {
            server,
            transport,
            authUserId,
            authTokenId,
            authWorkspaceId,
          };

          this.sessions.set(sid, entry);
          await this.storeSession(sid, credentials, signingSecret, {
            authUserId,
            authTokenId,
            authWorkspaceId,
          });
        },
        onsessionclosed: async (sid) => {
          if (!sid) {
            return;
          }

          this.sessions.delete(sid);
          await this.deleteSession(sid);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          this.sessions.delete(sid);
        }
      };

      await server.connect(transport);
      return transport.handleRequest(request, { parsedBody: body });
    } catch (error) {
      console.error("Error handling /mcp request in Durable Object:", error);
      return createJsonRpcError(500, -32603, "Internal server error");
    }
  }

  private async getSessionEntry(
    sessionId: string,
    secret: string,
  ): Promise<JiraSessionEntry | undefined> {
    const inMemory = this.sessions.get(sessionId);
    if (inMemory) {
      return inMemory;
    }

    const record = await this.readSessionRecord(sessionId);
    if (!record) {
      return undefined;
    }

    const credentials = await decryptSessionCredentials(record, secret).catch(() => null);
    if (!credentials) {
      await this.deleteSession(sessionId);
      return undefined;
    }

    const server = new JiraMcpServer(credentials.baseUrl, credentials.username, credentials.apiToken);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessionclosed: async (sid) => {
        if (!sid) {
          return;
        }

        this.sessions.delete(sid);
        await this.deleteSession(sid);
      },
    });

    const transportState = transport as unknown as {
      sessionId: string;
      _initialized: boolean;
    };
    transportState.sessionId = sessionId;
    transportState._initialized = true;

    await server.connect(transport);

    const entry: JiraSessionEntry = {
      server,
      transport,
      authUserId: record.authUserId,
      authTokenId: record.authTokenId,
      authWorkspaceId: record.authWorkspaceId,
    };
    this.sessions.set(sessionId, entry);
    return entry;
  }

  private async storeSession(
    sessionId: string,
    credentials: JiraClientCredentials,
    secret: string,
    auth: {
      authUserId?: string;
      authTokenId?: string;
      authWorkspaceId?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const record: StoredSessionRecord = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      authUserId: auth.authUserId,
      authTokenId: auth.authTokenId,
      authWorkspaceId: auth.authWorkspaceId,
      jiraBaseUrl: await encryptSessionValue(credentials.baseUrl, secret),
      jiraUsername: await encryptSessionValue(credentials.username, secret),
      jiraApiToken: await encryptSessionValue(credentials.apiToken, secret),
    };

    await this._state.storage.put(sessionKey(sessionId), record);
  }

  private async touchSession(sessionId: string): Promise<void> {
    const record = await this.readSessionRecord(sessionId);
    if (!record) {
      return;
    }

    record.updatedAt = new Date().toISOString();
    await this._state.storage.put(sessionKey(sessionId), record);
  }

  private async readSessionRecord(sessionId: string): Promise<StoredSessionRecord | null> {
    const record = await this._state.storage.get<StoredSessionRecord>(sessionKey(sessionId));
    if (!record) {
      return null;
    }

    if (isSessionExpired(record)) {
      await this.deleteSession(sessionId);
      return null;
    }

    return record;
  }

  private async deleteSession(sessionId: string): Promise<void> {
    await this._state.storage.delete(sessionKey(sessionId));
  }
}

function createJsonRpcError(status: number, code: number, message: string): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code,
        message,
      },
      id: null,
    },
    { status },
  );
}

async function parseJsonBody(request: Request): Promise<{ value: unknown; invalidJson: boolean }> {
  if (request.method !== "POST") {
    return { value: undefined, invalidJson: false };
  }

  try {
    return { value: await request.clone().json(), invalidJson: false };
  } catch {
    return { value: undefined, invalidJson: true };
  }
}

function readJiraCredentials(request: Request): JiraClientCredentials | null {
  const baseUrl = readHeaderOrQuery(request, "x-jira-base-url", "jiraBaseUrl");
  const username = readHeaderOrQuery(request, "x-jira-username", "jiraUsername");
  const apiToken = readHeaderOrQuery(request, "x-jira-api-token", "jiraApiToken");

  if (!baseUrl || !username || !apiToken) {
    return null;
  }

  return {
    baseUrl,
    username,
    apiToken,
  };
}

function readHeaderOrQuery(
  request: Request,
  headerName: string,
  queryName: string,
): string | undefined {
  const headerValue = request.headers.get(headerName);
  if (headerValue && headerValue.trim()) {
    return headerValue.trim();
  }

  const queryValue = new URL(request.url).searchParams.get(queryName);
  return queryValue?.trim() || undefined;
}

function getSessionIdFromRequest(request: Request): string | undefined {
  const queryValue = new URL(request.url).searchParams.get("sessionId");
  if (queryValue?.trim()) {
    return queryValue.trim();
  }

  const header = request.headers.get("mcp-session-id") ?? request.headers.get("x-mcp-session-id");
  return header?.trim() || undefined;
}

function isSessionExpired(record: StoredSessionRecord): boolean {
  const updatedAt = Date.parse(record.updatedAt);
  if (!Number.isFinite(updatedAt)) {
    return true;
  }

  return Date.now() - updatedAt > SESSION_LEASE_MS;
}

function sessionKey(sessionId: string): string {
  return `${SESSION_STORAGE_PREFIX}${sessionId}`;
}

async function encryptSessionValue(value: string, secret: string): Promise<EncryptedValue> {
  const key = await getSessionCryptoKey(secret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  return {
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    iv: bytesToBase64Url(iv),
  };
}

async function decryptSessionCredentials(
  record: StoredSessionRecord,
  secret: string,
): Promise<JiraClientCredentials> {
  return {
    baseUrl: await decryptSessionValue(record.jiraBaseUrl, secret),
    username: await decryptSessionValue(record.jiraUsername, secret),
    apiToken: await decryptSessionValue(record.jiraApiToken, secret),
  };
}

async function decryptSessionValue(value: EncryptedValue, secret: string): Promise<string> {
  const key = await getSessionCryptoKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64UrlToBytes(value.iv)),
    },
    key,
    toArrayBuffer(base64UrlToBytes(value.ciphertext)),
  );

  return new TextDecoder().decode(decrypted);
}

function getSessionCryptoKey(secret: string): Promise<CryptoKey> {
  const normalizedSecret = secret.trim();
  if (!normalizedSecret) {
    throw new Error("Missing internal signing secret");
  }

  if (cachedSessionCryptoKey && cachedSessionCryptoSecret === normalizedSecret) {
    return cachedSessionCryptoKey;
  }

  cachedSessionCryptoSecret = normalizedSecret;
  cachedSessionCryptoKey = crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(normalizedSecret))
    .then((digest) =>
      crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]),
    );

  return cachedSessionCryptoKey;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(String.fromCharCode(...bytes));

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
