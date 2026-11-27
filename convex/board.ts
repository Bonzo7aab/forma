import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/guard";
import { athleteView, exerciseView, resultView, sessionView } from "./validators";

export const overview = query({
  args: {},
  returns: v.object({
    athletes: v.array(athleteView),
    exercises: v.array(exerciseView),
    sessions: v.array(sessionView),
    results: v.array(resultView),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(100);
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
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
    const visibleExercises = exercises
      .map((exercise) => ({
        id: exercise._id,
        name: exercise.name,
        unit: exercise.unit,
        higherIsBetter: exercise.higherIsBetter,
        sortOrder: exercise.sortOrder,
        active: exercise.active,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const visibleSessions = sessions
      .map((session) => ({
        id: session._id,
        year: session.year,
        quarter: session.quarter,
        testedAt: session.testedAt,
        note: session.note,
        sample: session.sample,
      }))
      .sort((a, b) => a.year - b.year || a.quarter - b.quarter);

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
  },
});
