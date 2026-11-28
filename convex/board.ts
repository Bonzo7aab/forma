import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { sha256 } from "./lib/secret";
import { athleteView, exerciseView, resultView, sessionView } from "./validators";

const boardFields = {
  athletes: v.array(athleteView),
  exercises: v.array(exerciseView),
  sessions: v.array(sessionView),
  results: v.array(resultView),
};

const boardView = v.object(boardFields);

async function collectBoard(ctx: QueryCtx, athletes: Doc<"athletes">[]) {
  const exercises = await ctx.db
    .query("exercises")
    .withIndex("by_active_and_order", (q) => q.eq("active", true))
    .take(50);
  const sessions = await ctx.db.query("sessions").withIndex("by_year_and_quarter").take(40);

  const visibleAthletes = athletes
    .map((athlete) => ({
      id: athlete._id,
      name: athlete.name,
      group: athlete.group,
      active: athlete.active,
      sample: athlete.sample,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));
  const visibleExercises = exercises
    .map((exercise) => ({
      id: exercise._id,
      name: exercise.name,
      unit: exercise.unit,
      higherIsBetter: exercise.higherIsBetter,
      sortOrder: exercise.sortOrder,
      active: exercise.active,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const visibleSessions = sessions
    .map((session) => ({
      id: session._id,
      year: session.year,
      quarter: session.quarter,
      testedAt: session.testedAt,
      note: session.note,
      sample: session.sample,
    }))
    .sort((left, right) => left.year - right.year || left.quarter - right.quarter);

  const results = [];
  for (const athlete of visibleAthletes) {
    const rows = await ctx.db
      .query("results")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athlete.id))
      .take(200);
    for (const row of rows) {
      results.push({
        id: row._id,
        athleteId: row.athleteId,
        exerciseId: row.exerciseId,
        sessionId: row.sessionId,
        value: row.value,
      });
    }
  }

  return {
    athletes: visibleAthletes,
    exercises: visibleExercises,
    sessions: visibleSessions,
    results,
  };
}

async function groupFromToken(ctx: QueryCtx, token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const session = await ctx.db
    .query("groupSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (session === null || session.expiresAt <= Date.now()) return null;
  return await ctx.db.get("groups", session.groupId);
}

export const overview = query({
  args: {},
  returns: boardView,
  handler: async (ctx) => {
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(100);
    return collectBoard(ctx, athletes);
  },
});

export const forGroup = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(false) }),
    v.object({
      ok: v.literal(true),
      groupName: v.string(),
      ...boardFields,
    }),
  ),
  handler: async (ctx, args) => {
    const group = await groupFromToken(ctx, args.token);
    if (group === null) return { ok: false as const };
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);
    return {
      ok: true as const,
      groupName: group.name,
      ...(await collectBoard(
        ctx,
        athletes.filter((athlete) => athlete.group === group.name),
      )),
    };
  },
});
