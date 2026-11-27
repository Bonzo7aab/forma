import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/guard";
import { optionalText } from "./lib/text";
import { quarterValue } from "./validators";

export const create = mutation({
  args: {
    year: v.number(),
    quarter: quarterValue,
    testedAt: v.number(),
    note: v.string(),
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) {
      throw new ConvexError("Podaj rok między 2000 a 2100.");
    }
    if (!Number.isFinite(args.testedAt)) {
      throw new ConvexError("Podaj datę testu.");
    }
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_year_and_quarter", (q) => q.eq("year", args.year).eq("quarter", args.quarter))
      .unique();
    if (existing !== null) {
      throw new ConvexError("Ten kwartał jest już dodany.");
    }
    return await ctx.db.insert("sessions", {
      year: args.year,
      quarter: args.quarter,
      testedAt: args.testedAt,
      note: optionalText(args.note, 280, "Notatka"),
      sample: false,
    });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    testedAt: v.number(),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get("sessions", args.sessionId);
    if (session === null) {
      throw new ConvexError("Nie znaleziono kwartału.");
    }
    if (!Number.isFinite(args.testedAt)) {
      throw new ConvexError("Podaj datę testu.");
    }
    await ctx.db.patch("sessions", session._id, {
      testedAt: args.testedAt,
      note: optionalText(args.note, 280, "Notatka"),
    });
    return null;
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get("sessions", args.sessionId);
    if (session === null) {
      throw new ConvexError("Nie znaleziono kwartału.");
    }
    const results = await ctx.db
      .query("results")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(500);
    for (const result of results) {
      await ctx.db.delete("results", result._id);
    }
    await ctx.db.delete("sessions", session._id);
    return null;
  },
});
