import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

type D1PreparedStatementLike = {
  bind(...values: unknown[]): {
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
  };
};

export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
};

const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
});

const apiTokensTable = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenName: text("token_name").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
  expiresAt: text("expires_at"),
  revokedAt: text("revoked_at"),
});

type RegisterPayload = {
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
  tokenName?: string;
  expiresInDays?: number;
  neverExpires?: boolean;
};

type TokenCreatePayload = {
  tokenName?: string;
  expiresInDays?: number;
  neverExpires?: boolean;
};

type TokenRevokePayload = {
  tokenId: string;
};

export type UserAuthContext = {
  type: "user";
  userId: string;
  email: string;
  tokenId: string;
};

type SessionUserContext = {
  userId: string;
  email: string;
};

type SessionUserResolver = (request: Request) => Promise<SessionUserContext | null>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;
const DEFAULT_TOKEN_TTL_DAYS = 30;
const MAX_TOKEN_TTL_DAYS = 365;
const PASSWORD_HASH_ITERATIONS = 100000;

export class WorkerAuthService {
  constructor(
    private readonly db?: D1DatabaseLike,
    private readonly resolveSessionUser?: SessionUserResolver,
  ) {}

  isConfigured(): boolean {
    return !!this.db;
  }

  private getDb() {
    if (!this.db) {
      return null;
    }

    return drizzle(this.db as never);
  }

  async handleAuthRequest(request: Request): Promise<Response | null> {
    const url = new URL(request.url);

    if (url.pathname === "/auth/register") {
      if (request.method !== "POST") {
        return methodNotAllowed(["POST"]);
      }
      return this.register(request);
    }

    if (url.pathname === "/auth/login") {
      if (request.method !== "POST") {
        return methodNotAllowed(["POST"]);
      }
      return this.login(request);
    }

    if (url.pathname === "/auth/me") {
      if (request.method !== "GET") {
        return methodNotAllowed(["GET"]);
      }

      return this.me(request);
    }

    if (url.pathname === "/auth/tokens") {
      if (request.method === "GET") {
        return this.listTokens(request);
      }

      if (request.method === "POST") {
        return this.createToken(request);
      }

      return methodNotAllowed(["GET", "POST"]);
    }

    if (url.pathname === "/auth/tokens/revoke") {
      if (request.method !== "POST") {
        return methodNotAllowed(["POST"]);
      }

      return this.revokeToken(request);
    }

    return null;
  }

  async validateUserToken(token: string): Promise<UserAuthContext | null> {
    const db = this.getDb();
    if (!db) {
      return null;
    }

    const tokenHash = await hashToken(token);
    const now = nowIso();

    const rows = await db
      .select({
        tokenId: apiTokensTable.id,
        userId: apiTokensTable.userId,
        email: usersTable.email,
      })
      .from(apiTokensTable)
      .innerJoin(usersTable, eq(usersTable.id, apiTokensTable.userId))
      .where(
        and(
          eq(apiTokensTable.tokenHash, tokenHash),
          isNull(apiTokensTable.revokedAt),
          or(isNull(apiTokensTable.expiresAt), gt(apiTokensTable.expiresAt, now)),
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    await db
      .update(apiTokensTable)
      .set({ lastUsedAt: now })
      .where(eq(apiTokensTable.id, row.tokenId));

    return {
      type: "user",
      userId: row.userId,
      email: row.email,
      tokenId: row.tokenId,
    };
  }

  private async register(request: Request): Promise<Response> {
    const db = this.getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "Auth is not configured. Bind a D1 database before using /auth routes.",
      });
    }

    const payload = await readJson<RegisterPayload>(request);
    if (!payload.ok) {
      return jsonResponse(400, { error: payload.error });
    }

    const email = payload.value.email?.trim().toLowerCase();
    const password = payload.value.password ?? "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return jsonResponse(400, { error: "A valid email is required." });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse(400, {
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      });
    }

    const existingUserRows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    const existingUser = existingUserRows[0];

    if (existingUser) {
      return jsonResponse(409, {
        error: "A user with this email already exists.",
      });
    }

    const userId = crypto.randomUUID();
    const salt = randomBase64Url(16);
    const passwordHash = await hashPassword(password, salt);
    const createdAt = nowIso();

    await db.insert(usersTable).values({
      id: userId,
      email,
      passwordHash,
      passwordSalt: salt,
      createdAt,
    });

    return jsonResponse(201, {
      userId,
      email,
      message: "User registered successfully.",
    });
  }

  private async login(request: Request): Promise<Response> {
    const db = this.getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "Auth is not configured. Bind a D1 database before using /auth routes.",
      });
    }

    const payload = await readJson<LoginPayload>(request);
    if (!payload.ok) {
      return jsonResponse(400, { error: payload.error });
    }

    const email = payload.value.email?.trim().toLowerCase();
    const password = payload.value.password ?? "";

    if (!email || !password) {
      return jsonResponse(400, {
        error: "Both email and password are required.",
      });
    }

    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        passwordSalt: usersTable.passwordSalt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    const user = users[0];

    if (!user) {
      return jsonResponse(401, { error: "Invalid email or password." });
    }

    const computedHash = await hashPassword(password, user.passwordSalt);
    if (!timingSafeEqual(computedHash, user.passwordHash)) {
      return jsonResponse(401, { error: "Invalid email or password." });
    }

    const tokenOptions = validateTokenOptions(payload.value);
    if (!tokenOptions.ok) {
      return jsonResponse(400, { error: tokenOptions.error });
    }

    const tokenPlainText = `mcp_${randomBase64Url(32)}`;
    const issuedToken = await this.issueToken(user.id, tokenPlainText, tokenOptions.value);

    return jsonResponse(200, {
      token: issuedToken.token,
      tokenId: issuedToken.tokenId,
      tokenName: issuedToken.tokenName,
      tokenPrefix: issuedToken.tokenPrefix,
      expiresAt: issuedToken.expiresAt,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  }

  private async me(request: Request): Promise<Response> {
    const context = await this.requireUserContext(request);
    if (!context) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    return jsonResponse(200, {
      user: {
        id: context.userId,
        email: context.email,
      },
      currentTokenId: context.tokenId || null,
    });
  }

  private async listTokens(request: Request): Promise<Response> {
    const db = this.getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "Auth is not configured. Bind a D1 database before using /auth routes.",
      });
    }

    const context = await this.requireUserContext(request);
    if (!context) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const tokenRows = await db
      .select({
        id: apiTokensTable.id,
        tokenName: apiTokensTable.tokenName,
        tokenPrefix: apiTokensTable.tokenPrefix,
        createdAt: apiTokensTable.createdAt,
        lastUsedAt: apiTokensTable.lastUsedAt,
        expiresAt: apiTokensTable.expiresAt,
        revokedAt: apiTokensTable.revokedAt,
      })
      .from(apiTokensTable)
      .where(eq(apiTokensTable.userId, context.userId))
      .orderBy(desc(apiTokensTable.createdAt))
      .limit(100);

    return jsonResponse(200, {
      currentTokenId: context.tokenId || null,
      tokens: tokenRows.map((token) => ({
        id: token.id,
        tokenName: token.tokenName,
        tokenPrefix: token.tokenPrefix,
        createdAt: token.createdAt,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        isCurrent: context.tokenId ? token.id === context.tokenId : false,
      })),
    });
  }

  private async createToken(request: Request): Promise<Response> {
    if (!this.db) {
      return jsonResponse(503, {
        error: "Auth is not configured. Bind a D1 database before using /auth routes.",
      });
    }

    const context = await this.requireUserContext(request);
    if (!context) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const payload = await readJson<TokenCreatePayload>(request);
    if (!payload.ok) {
      return jsonResponse(400, { error: payload.error });
    }

    const tokenOptions = validateTokenOptions(payload.value);
    if (!tokenOptions.ok) {
      return jsonResponse(400, { error: tokenOptions.error });
    }

    const tokenPlainText = `mcp_${randomBase64Url(32)}`;
    const issuedToken = await this.issueToken(context.userId, tokenPlainText, tokenOptions.value);

    return jsonResponse(201, {
      token: issuedToken.token,
      tokenId: issuedToken.tokenId,
      tokenName: issuedToken.tokenName,
      tokenPrefix: issuedToken.tokenPrefix,
      expiresAt: issuedToken.expiresAt,
      user: {
        id: context.userId,
        email: context.email,
      },
    });
  }

  private async revokeToken(request: Request): Promise<Response> {
    const db = this.getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "Auth is not configured. Bind a D1 database before using /auth routes.",
      });
    }

    const context = await this.requireUserContext(request);
    if (!context) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const payload = await readJson<TokenRevokePayload>(request);
    if (!payload.ok) {
      return jsonResponse(400, { error: payload.error });
    }

    const tokenId = payload.value.tokenId?.trim();
    if (!tokenId) {
      return jsonResponse(400, { error: "tokenId is required." });
    }

    const tokens = await db
      .select({ id: apiTokensTable.id, revokedAt: apiTokensTable.revokedAt })
      .from(apiTokensTable)
      .where(and(eq(apiTokensTable.id, tokenId), eq(apiTokensTable.userId, context.userId)))
      .limit(1);
    const token = tokens[0];

    if (!token) {
      return jsonResponse(404, { error: "Token not found for this user." });
    }

    if (token.revokedAt) {
      return jsonResponse(200, {
        tokenId,
        revokedAt: token.revokedAt,
        alreadyRevoked: true,
      });
    }

    const revokedAt = nowIso();
    await db
      .update(apiTokensTable)
      .set({ revokedAt })
      .where(and(eq(apiTokensTable.id, tokenId), eq(apiTokensTable.userId, context.userId)));

    return jsonResponse(200, {
      tokenId,
      revokedAt,
      alreadyRevoked: false,
    });
  }

  private async requireUserContext(request: Request): Promise<UserAuthContext | null> {
    const token = getBearerToken(request);
    if (token) {
      return this.validateUserToken(token);
    }

    if (!this.resolveSessionUser) {
      return null;
    }

    const sessionUser = await this.resolveSessionUser(request);
    if (!sessionUser) {
      return null;
    }

    const legacyUserId = await this.resolveLegacyUserIdForSession(sessionUser);
    if (!legacyUserId) {
      return null;
    }

    return {
      type: "user",
      userId: legacyUserId,
      email: sessionUser.email,
      tokenId: "",
    };
  }

  private async resolveLegacyUserIdForSession(
    sessionUser: SessionUserContext,
  ): Promise<string | null> {
    const db = this.getDb();
    if (!db) {
      return null;
    }

    const normalizedEmail = sessionUser.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const existingUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existingUsers[0]?.id) {
      return existingUsers[0].id;
    }

    const userId = sessionUser.userId || crypto.randomUUID();
    const createdAt = nowIso();
    const placeholderSalt = randomBase64Url(16);
    const placeholderHash = await hashPassword(randomBase64Url(32), placeholderSalt);

    try {
      await db.insert(usersTable).values({
        id: userId,
        email: normalizedEmail,
        passwordHash: placeholderHash,
        passwordSalt: placeholderSalt,
        createdAt,
      });
      return userId;
    } catch {
      const conflictUsers = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail))
        .limit(1);
      return conflictUsers[0]?.id || null;
    }
  }

  private async issueToken(
    userId: string,
    tokenPlainText: string,
    options: {
      tokenName: string;
      expiresAt: string | null;
    },
  ): Promise<{
    token: string;
    tokenId: string;
    tokenName: string;
    tokenPrefix: string;
    expiresAt: string | null;
  }> {
    const db = this.getDb();
    if (!db) {
      throw new Error("Auth DB is not configured.");
    }

    const tokenHash = await hashToken(tokenPlainText);
    const tokenId = crypto.randomUUID();
    const createdAt = nowIso();
    const tokenPrefix = tokenPlainText.slice(0, 12);
    const tokenName = options.tokenName;
    const expiresAt = options.expiresAt;

    await db.insert(apiTokensTable).values({
      id: tokenId,
      userId,
      tokenName,
      tokenPrefix,
      tokenHash,
      createdAt,
      expiresAt,
      lastUsedAt: null,
      revokedAt: null,
    });

    return {
      token: tokenPlainText,
      tokenId,
      tokenName,
      tokenPrefix,
      expiresAt,
    };
  }
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function validateTokenOptions(options: {
  tokenName?: string;
  expiresInDays?: number;
  neverExpires?: boolean;
}):
  | {
      ok: true;
      value: {
        tokenName: string;
        expiresAt: string | null;
      };
    }
  | {
      ok: false;
      error: string;
    } {
  const tokenName = options.tokenName?.trim() || "default";
  if (tokenName.length > 80) {
    return {
      ok: false,
      error: "tokenName must be 80 characters or fewer.",
    };
  }

  if (options.neverExpires === true) {
    return {
      ok: true,
      value: {
        tokenName,
        expiresAt: null,
      },
    };
  }

  const requestedTtlDays = options.expiresInDays;
  if (requestedTtlDays === 0) {
    return {
      ok: true,
      value: {
        tokenName,
        expiresAt: null,
      },
    };
  }

  if (
    typeof requestedTtlDays === "number" &&
    (!Number.isFinite(requestedTtlDays) || requestedTtlDays < 0)
  ) {
    return {
      ok: false,
      error: "expiresInDays must be a positive number, 0, or omitted.",
    };
  }

  const ttlDays =
    typeof requestedTtlDays === "number"
      ? Math.max(1, Math.min(MAX_TOKEN_TTL_DAYS, Math.floor(requestedTtlDays)))
      : DEFAULT_TOKEN_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    ok: true,
    value: {
      tokenName,
      expiresAt,
    },
  };
}

async function readJson<T>(
  request: Request,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const value = (await request.json()) as T;
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Request body must be valid JSON." };
  }
}

function methodNotAllowed(allowedMethods: string[]): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: allowedMethods.join(", "),
    },
  });
}

function jsonResponse(status: number, payload: unknown): Response {
  return Response.json(payload, { status });
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function hashPassword(password: string, saltBase64Url: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(base64UrlToBytes(saltBase64Url)),
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return bytesToBase64Url(new Uint8Array(bits));
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }

  return result === 0;
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
    return Uint8Array.from(Buffer.from(padded, "base64"));
  }

  const decoded = atob(padded);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
