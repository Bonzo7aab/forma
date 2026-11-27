import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/guard";

export const saveForSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    entries: v.array(
      v.object({
        athleteId: v.id("athletes"),
        exerciseId: v.id("exercises"),
        value: v.union(v.number(), v.null()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.entries.length > 1000) {
      throw new ConvexError("Za dużo wyników w jednym zapisie.");
    }
    const session = await ctx.db.get("sessions", args.sessionId);
    if (session === null) {
      throw new ConvexError("Nie znaleziono kwartału.");
    }

    const seen = new Set<string>();
    for (const entry of args.entries) {
      const key = `${entry.athleteId}:${entry.exerciseId}`;
      if (seen.has(key)) {
        throw new ConvexError("Powtórzony wynik w zapisie.");
      }
      seen.add(key);
      if (entry.value !== null) {
        if (!Number.isFinite(entry.value) || entry.value <= 0 || entry.value > 100000) {
          throw new ConvexError("Każdy wynik musi być liczbą większą od zera.");
        }
      }
      const athlete = await ctx.db.get("athletes", entry.athleteId);
      const exercise = await ctx.db.get("exercises", entry.exerciseId);
      if (athlete === null || exercise === null) {
        throw new ConvexError("Wynik wskazuje na nieistniejącą osobę albo ćwiczenie.");
      }
    }

    const existing = await ctx.db
      .query("results")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .take(1000);
    const byKey = new Map(existing.map((result) => [`${result.athleteId}:${result.exerciseId}`, result]));

    for (const entry of args.entries) {
      const key = `${entry.athleteId}:${entry.exerciseId}`;
      const current = byKey.get(key);
      if (entry.value === null) {
        if (current) {
          await ctx.db.delete("results", current._id);
        }
        continue;
      }
      if (current) {
        if (current.value !== entry.value) {
          await ctx.db.patch("results", current._id, { value: entry.value });
        }
        continue;
      }
      await ctx.db.insert("results", {
        athleteId: entry.athleteId,
        exerciseId: entry.exerciseId,
        sessionId: session._id,
        value: entry.value,
      });
    }
    return null;
  },
});
