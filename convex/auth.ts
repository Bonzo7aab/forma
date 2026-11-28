import { createFunctionHandle, getFunctionAddress } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId, setupConvexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { hashPassword, verifyPassword } from "./lib/secret";

const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 100;
const ACCESS_TOKEN_TTL_SECONDS = 60;
const SESSION_MAX_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

const auth = setupConvexAuth({ component: components.auth });

export const { signOut, refreshSession, isAuthenticated } = auth;

const passwordFormatError = v.union(
  v.object({
    error: v.literal("PASSWORD_TOO_SHORT"),
    minimumLength: v.number(),
  }),
  v.object({
    error: v.literal("PASSWORD_TOO_LONG"),
    maximumLength: v.number(),
  }),
  v.object({ error: v.literal("PASSWORD_HAS_SURROUNDING_WHITESPACE") }),
);

const usernameFormatError = v.union(
  v.object({
    error: v.literal("USERNAME_TOO_SHORT"),
    minimumLength: v.number(),
  }),
  v.object({
    error: v.literal("USERNAME_TOO_LONG"),
    maximumLength: v.number(),
  }),
  v.object({ error: v.literal("USERNAME_HAS_SURROUNDING_WHITESPACE") }),
  v.object({ error: v.literal("USERNAME_HAS_INVALID_CHARACTERS") }),
);

const tokens = v.object({
  accessToken: v.string(),
  refreshToken: v.string(),
  refreshTokenExpiresAt: v.number(),
  userId: v.string(),
});

const sessionTtl = {
  accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
  refreshInactivityTimeoutSeconds: SESSION_MAX_LIFETIME_SECONDS,
  sessionMaxLifetimeSeconds: SESSION_MAX_LIFETIME_SECONDS,
};

function passwordError(password: string) {
  const length = [...password].length;
  if (length < MIN_PASSWORD_LENGTH) {
    return { error: "PASSWORD_TOO_SHORT" as const, minimumLength: MIN_PASSWORD_LENGTH };
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return { error: "PASSWORD_TOO_LONG" as const, maximumLength: MAX_PASSWORD_LENGTH };
  }
  if (/^\s|\s$/u.test(password)) {
    return { error: "PASSWORD_HAS_SURROUNDING_WHITESPACE" as const };
  }
  return null;
}

function usernameError(username: string) {
  const length = [...username].length;
  if (length < 1) {
    return { error: "USERNAME_TOO_SHORT" as const, minimumLength: 1 };
  }
  if (length > 100) {
    return { error: "USERNAME_TOO_LONG" as const, maximumLength: 100 };
  }
  if (/^\s|\s$/u.test(username)) {
    return { error: "USERNAME_HAS_SURROUNDING_WHITESPACE" as const };
  }
  if (/[\u0000-\u001F\u007F]/.test(username)) {
    return { error: "USERNAME_HAS_INVALID_CHARACTERS" as const };
  }
  return null;
}

function componentPath(component: unknown) {
  const prefix = "_reference/childComponent/";
  const reference = getFunctionAddress(component as Parameters<typeof getFunctionAddress>[0]).reference;
  if (reference === undefined || !reference.startsWith(prefix) || reference.length === prefix.length) {
    throw new Error("Brak ścieżki komponentu logowania.");
  }
  return reference.slice(prefix.length);
}

async function passwordMatches(ctx: MutationCtx, userId: string, password: string, passwordHash: string | undefined) {
  if (passwordHash) return verifyPassword(password, passwordHash);
  if ([...password].length < 8) return false;
  const result = await ctx.runMutation(components.authPassword.public.verifyPassword, { userId, password });
  return result.success;
}

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  userId: string;
};

async function openSession(ctx: MutationCtx, userId?: string): Promise<SessionTokens> {
  if (userId === undefined) {
    const createUserHandle: string = await createFunctionHandle(internal.users.createUser);
    return await ctx.runMutation(components.auth.public._internal_dangerous_signUp, {
      claims: { method: "usernamePassword", profile: {} },
      componentPath: componentPath(components.authPassword),
      createUserHandle,
      ...sessionTtl,
    });
  }
  return await ctx.runMutation(components.auth.public._internal_dangerous_signIn, {
    claims: { method: "usernamePassword", profile: {} },
    componentPath: componentPath(components.authPassword),
    userId,
    ...sessionTtl,
  });
}

export const signUpWithUsernamePassword = mutation({
  args: { username: v.string(), password: v.string() },
  returns: v.union(
    v.object({ status: v.literal("complete"), tokens }),
    v.object({
      status: v.literal("error"),
      userError: v.union(passwordFormatError, usernameFormatError, v.object({ error: v.literal("USERNAME_TAKEN") })),
    }),
  ),
  handler: async (ctx, { username, password }) => {
    const invalidUsername = usernameError(username);
    if (invalidUsername) return { status: "error" as const, userError: invalidUsername };
    const invalidPassword = passwordError(password);
    if (invalidPassword) return { status: "error" as const, userError: invalidPassword };
    const existing = await ctx.runQuery(components.authUsername.public.getUserIdByUsername, { username });
    if (existing !== null) {
      return { status: "error" as const, userError: { error: "USERNAME_TAKEN" as const } };
    }
    const session = await openSession(ctx);
    const savedUsername = await ctx.runMutation(components.authUsername.public.setUsername, {
      userId: session.userId,
      username,
    });
    if (!savedUsername.success) {
      throw new Error("Nie udało się zapisać loginu.");
    }
    await ctx.db.patch("users", session.userId as Id<"users">, {
      passwordHash: await hashPassword(password),
    });
    return { status: "complete" as const, tokens: session };
  },
});

export const signInWithUsernamePassword = mutation({
  args: { username: v.string(), password: v.string() },
  returns: v.union(
    v.object({ status: v.literal("complete"), tokens }),
    v.object({
      status: v.literal("error"),
      userError: v.union(
        v.object({ error: v.literal("INVALID_CREDENTIALS") }),
        v.object({ error: v.literal("USER_NOT_FOUND") }),
      ),
    }),
  ),
  handler: async (ctx, { username, password }) => {
    const userId = await ctx.runQuery(components.authUsername.public.getUserIdByUsername, { username });
    if (userId === null) {
      return { status: "error" as const, userError: { error: "USER_NOT_FOUND" as const } };
    }
    const user = await ctx.db.get("users", userId as Id<"users">);
    const matches = await passwordMatches(ctx, userId, password, user?.passwordHash);
    if (!matches) {
      return { status: "error" as const, userError: { error: "INVALID_CREDENTIALS" as const } };
    }
    const session = await openSession(ctx, userId);
    return { status: "complete" as const, tokens: session };
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
    signOutOtherSessions: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({
      success: v.literal(false),
      userError: v.union(
        passwordFormatError,
        v.object({ error: v.literal("NOT_LOGGED_IN") }),
        v.object({ error: v.literal("INVALID_CREDENTIALS") }),
      ),
    }),
  ),
  handler: async (ctx, { currentPassword, newPassword, signOutOtherSessions }) => {
    const invalidPassword = passwordError(newPassword);
    if (invalidPassword) return { success: false as const, userError: invalidPassword };
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { success: false as const, userError: { error: "NOT_LOGGED_IN" as const } };
    }
    const user = await ctx.db.get("users", userId);
    const matches = await passwordMatches(ctx, userId, currentPassword, user?.passwordHash);
    if (!matches) {
      return { success: false as const, userError: { error: "INVALID_CREDENTIALS" as const } };
    }
    await ctx.db.patch("users", userId, { passwordHash: await hashPassword(newPassword) });
    if (signOutOtherSessions) {
      await revokeOtherSessions(ctx, userId);
    }
    return { success: true as const };
  },
});

async function revokeOtherSessions(ctx: MutationCtx, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  const currentSessionId = identity?.subject;
  const sessions = await ctx.runQuery(components.auth.public.listSessions, { userId });
  const sessionIds = sessions
    .map((session) => session.sessionId)
    .filter((sessionId) => sessionId !== currentSessionId);
  if (sessionIds.length === 0) return;
  await ctx.runMutation(components.auth.public.revokeSessions, { sessionIds });
}
