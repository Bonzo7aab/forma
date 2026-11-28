import { ConvexError, v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/guard";
import { hashPassword, randomToken, sha256, verifyPassword } from "./lib/secret";
import { requiredText } from "./lib/text";

const SESSION_MS = 12 * 60 * 60 * 1000;

const groupSummary = v.object({
  name: v.string(),
  hasPassword: v.boolean(),
});

async function namesInUse(ctx: QueryCtx, activeOnly: boolean) {
  const active = await ctx.db
    .query("athletes")
    .withIndex("by_active", (q) => q.eq("active", true))
    .take(200);
  const hidden = activeOnly
    ? []
    : await ctx.db
        .query("athletes")
        .withIndex("by_active", (q) => q.eq("active", false))
        .take(200);
  return [...new Set([...active, ...hidden].map((athlete) => athlete.group).filter((name) => name.length > 0))].sort(
    (left, right) => left.localeCompare(right, "pl"),
  );
}

async function summarize(ctx: QueryCtx, names: string[]) {
  const groups = [];
  for (const name of names) {
    const row = await ctx.db
      .query("groups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    groups.push({ name, hasPassword: row !== null && row.passwordHash.length > 0 });
  }
  return groups;
}

export const listPublic = query({
  args: {},
  returns: v.array(groupSummary),
  handler: async (ctx) => summarize(ctx, await namesInUse(ctx, true)),
});

export const listManage = query({
  args: {},
  returns: v.array(groupSummary),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return summarize(ctx, await namesInUse(ctx, false));
  },
});

export const setPassword = mutation({
  args: { name: v.string(), password: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = requiredText(args.name, 1, 40, "Grupa");
    if (args.password.length < 4 || args.password.length > 80) {
      throw new ConvexError("Hasło grupy musi mieć od 4 do 80 znaków.");
    }
    const known = await namesInUse(ctx, false);
    if (!known.includes(name)) {
      throw new ConvexError("Najpierw przypisz tę grupę podopiecznemu.");
    }
    const passwordHash = await hashPassword(args.password);
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    const groupId = existing
      ? existing._id
      : await ctx.db.insert("groups", { name, passwordHash });
    if (existing) {
      await ctx.db.patch("groups", groupId, { passwordHash });
    }
    const sessions = await ctx.db
      .query("groupSessions")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .take(100);
    for (const session of sessions) {
      await ctx.db.delete("groupSessions", session._id);
    }
    return null;
  },
});

export const unlock = mutation({
  args: { name: v.string(), password: v.string() },
  returns: v.object({
    token: v.string(),
    groupName: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const name = requiredText(args.name, 1, 40, "Grupa");
    const group = await ctx.db
      .query("groups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (group === null || group.passwordHash.length === 0) {
      throw new ConvexError("Administrator nie ustawił jeszcze hasła tej grupy.");
    }
    const matches = await verifyPassword(args.password, group.passwordHash);
    if (!matches) {
      throw new ConvexError("Nieprawidłowe hasło.");
    }
    const token = randomToken();
    const expiresAt = Date.now() + SESSION_MS;
    await ctx.db.insert("groupSessions", {
      groupId: group._id,
      tokenHash: await sha256(token),
      expiresAt,
    });
    return { token, groupName: group.name, expiresAt };
  },
});
