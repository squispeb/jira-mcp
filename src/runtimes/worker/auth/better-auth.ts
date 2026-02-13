import type { D1DatabaseLike } from "../auth-service";
import * as generatedSchema from "./schema.generated";

const betterAuthSchema = {
  ...generatedSchema,
  user: generatedSchema.auth_users,
  session: generatedSchema.auth_sessions,
  account: generatedSchema.auth_accounts,
  verification: generatedSchema.auth_verifications,
};

type BetterAuthLike = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession(input: { headers: Headers }): Promise<unknown>;
  };
};

type BetterAuthUser = {
  userId: string;
  email: string;
};

const DEFAULT_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const authCache = new WeakMap<object, Promise<BetterAuthLike>>();

export async function handleBetterAuthRequest(
  request: Request,
  db: D1DatabaseLike | undefined,
  secret: string | undefined,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/auth")) {
    return null;
  }

  if (!db || !secret) {
    return Response.json(
      {
        error: "Better Auth is not configured. Missing AUTH_DB or BETTER_AUTH_SECRET.",
      },
      { status: 503 },
    );
  }

  const auth = await getAuthInstance(db, secret, new URL(request.url).origin);
  return auth.handler(request);
}

export async function resolveBetterAuthUserFromRequest(
  request: Request,
  db: D1DatabaseLike | undefined,
  secret: string | undefined,
): Promise<BetterAuthUser | null> {
  if (!db || !secret) {
    return null;
  }

  const auth = await getAuthInstance(db, secret, new URL(request.url).origin);
  const session = (await auth.api.getSession({ headers: request.headers })) as {
    user?: { id?: string; email?: string };
  } | null;

  const userId = session?.user?.id?.trim();
  const email = session?.user?.email?.trim();
  if (!userId || !email) {
    return null;
  }

  return {
    userId,
    email,
  };
}

async function getAuthInstance(
  db: D1DatabaseLike,
  secret: string,
  requestOrigin: string,
): Promise<BetterAuthLike> {
  const cacheKey = db as unknown as object;
  const cached = authCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const authPromise = createAuthInstance(db, secret, requestOrigin);
  authCache.set(cacheKey, authPromise);
  return authPromise;
}

async function createAuthInstance(
  db: D1DatabaseLike,
  secret: string,
  requestOrigin: string,
): Promise<BetterAuthLike> {
  const [{ betterAuth }, { drizzleAdapter }, { drizzle }] = await Promise.all([
    import("better-auth"),
    import("better-auth/adapters/drizzle"),
    import("drizzle-orm/d1"),
  ]);

  const drizzleDb = drizzle(db as never, { schema: betterAuthSchema });

  const auth = betterAuth({
    secret,
    basePath: "/api/auth",
    user: {
      modelName: "auth_users",
    },
    session: {
      modelName: "auth_sessions",
    },
    account: {
      modelName: "auth_accounts",
    },
    verification: {
      modelName: "auth_verifications",
    },
    database: drizzleAdapter(drizzleDb, {
      provider: "sqlite",
      schema: betterAuthSchema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    trustedOrigins: [...DEFAULT_TRUSTED_ORIGINS, requestOrigin],
  });

  return auth as BetterAuthLike;
}
