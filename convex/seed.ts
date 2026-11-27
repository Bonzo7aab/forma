import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/guard";

const seedResult = v.object({
  seeded: v.boolean(),
  athletes: v.number(),
  results: v.number(),
});

const defaultExercises = [
  { name: "Bieg 30 m", unit: "s", higherIsBetter: false },
  { name: "Skok w dal z miejsca", unit: "cm", higherIsBetter: true },
  { name: "Rzut piłką lekarską", unit: "m", higherIsBetter: true },
  { name: "Przysiady w 30 s", unit: "powt.", higherIsBetter: true },
  { name: "Bieg wahadłowy", unit: "poziom", higherIsBetter: true },
] as const;

const people = [
  { name: "Zofia Lewandowska", group: "Poranna" },
  { name: "Jan Mazur", group: "Poranna" },
  { name: "Hanna Król", group: "Wieczorna" },
  { name: "Antoni Wójcik", group: "Wieczorna" },
  { name: "Lena Nowak", group: "Senior" },
  { name: "Filip Zieliński", group: "Poranna" },
  { name: "Maja Kaczmarek", group: "Wieczorna" },
  { name: "Igor Pawlak", group: "Otwarta" },
  { name: "Natalia Sikora", group: "Wieczorna" },
  { name: "Bartosz Lis", group: "Senior" },
  { name: "Emilia Górska", group: "Otwarta" },
  { name: "Oliwia Dąbrowska", group: "Senior" },
] as const;

const quarters = [
  { year: 2025, quarter: 1, testedAt: Date.parse("2025-03-15T12:00:00.000Z"), note: "Początek sezonu" },
  { year: 2025, quarter: 2, testedAt: Date.parse("2025-06-14T12:00:00.000Z"), note: "" },
  { year: 2025, quarter: 3, testedAt: Date.parse("2025-09-13T12:00:00.000Z"), note: "" },
  { year: 2025, quarter: 4, testedAt: Date.parse("2025-12-06T12:00:00.000Z"), note: "Koniec roku" },
  { year: 2026, quarter: 1, testedAt: Date.parse("2026-03-14T12:00:00.000Z"), note: "" },
  { year: 2026, quarter: 2, testedAt: Date.parse("2026-06-13T12:00:00.000Z"), note: "" },
] as const;

type Profile = {
  low: number;
  high: number;
  trend: number;
  spread: number;
  digits: number;
  floor: number;
  ceil: number;
};

function profileFor(unit: string, higherIsBetter: boolean): Profile {
  if (!higherIsBetter) {
    return { low: 4.55, high: 5.75, trend: -0.055, spread: 0.04, digits: 2, floor: 3.9, ceil: 7.5 };
  }
  if (unit === "cm") {
    return { low: 158, high: 228, trend: 3.1, spread: 3.5, digits: 0, floor: 120, ceil: 280 };
  }
  if (unit === "m") {
    return { low: 5.4, high: 9.2, trend: 0.16, spread: 0.22, digits: 1, floor: 3, ceil: 14 };
  }
  if (unit === "powt.") {
    return { low: 22, high: 36, trend: 0.65, spread: 1.1, digits: 0, floor: 10, ceil: 60 };
  }
  return { low: 6.4, high: 11.4, trend: 0.22, spread: 0.18, digits: 1, floor: 3, ceil: 16 };
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, digits: number) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function skipped(athleteIndex: number, exerciseIndex: number, quarterIndex: number) {
  return (
    (athleteIndex === 7 && exerciseIndex === 2 && quarterIndex === 2) ||
    (athleteIndex === 2 && exerciseIndex === 0 && quarterIndex === 5) ||
    (athleteIndex === 10 && exerciseIndex === 4 && quarterIndex === 1)
  );
}

export async function loadSamples(ctx: MutationCtx) {
  const existingAthlete = await ctx.db.query("athletes").take(1);
  const existingSession = await ctx.db.query("sessions").take(1);
  if (existingAthlete.length > 0 || existingSession.length > 0) {
    return { seeded: false, athletes: 0, results: 0 };
  }

  let exercises = await ctx.db
    .query("exercises")
    .withIndex("by_active_and_order", (q) => q.eq("active", true))
    .take(20);
  if (exercises.length === 0) {
    for (let index = 0; index < defaultExercises.length; index += 1) {
      const exercise = defaultExercises[index];
      await ctx.db.insert("exercises", {
        name: exercise.name,
        unit: exercise.unit,
        higherIsBetter: exercise.higherIsBetter,
        sortOrder: index,
        active: true,
      });
    }
    exercises = await ctx.db
      .query("exercises")
      .withIndex("by_active_and_order", (q) => q.eq("active", true))
      .take(20);
  }

  const athleteIds: Array<Id<"athletes">> = [];
  for (const person of people) {
    athleteIds.push(
      await ctx.db.insert("athletes", {
        name: person.name,
        group: person.group,
        active: true,
        sample: true,
      }),
    );
  }

  const sessionIds: Array<Id<"sessions">> = [];
  for (const quarter of quarters) {
    sessionIds.push(
      await ctx.db.insert("sessions", {
        year: quarter.year,
        quarter: quarter.quarter,
        testedAt: quarter.testedAt,
        note: quarter.note,
        sample: true,
      }),
    );
  }

  const rng = mulberry32(20250315);
  let results = 0;
  for (let athleteIndex = 0; athleteIndex < athleteIds.length; athleteIndex += 1) {
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
      const exercise = exercises[exerciseIndex];
      const profile = profileFor(exercise.unit, exercise.higherIsBetter);
      const start = profile.low + (profile.high - profile.low) * rng();
      for (let quarterIndex = 0; quarterIndex < sessionIds.length; quarterIndex += 1) {
        if (skipped(athleteIndex, exerciseIndex, quarterIndex)) {
          continue;
        }
        let value = start + profile.trend * quarterIndex + (rng() - 0.5) * 2 * profile.spread;
        if (athleteIndex === 4 && exercise.unit === "cm" && quarterIndex === 3) {
          value -= 8;
        }
        value = Math.min(profile.ceil, Math.max(profile.floor, value));
        await ctx.db.insert("results", {
          athleteId: athleteIds[athleteIndex],
          exerciseId: exercise._id,
          sessionId: sessionIds[quarterIndex],
          value: roundTo(value, profile.digits),
        });
        results += 1;
      }
    }
  }

  return { seeded: true, athletes: athleteIds.length, results };
}

export const load = internalMutation({
  args: {},
  returns: seedResult,
  handler: async (ctx) => loadSamples(ctx),
});

export const loadForAdmin = mutation({
  args: {},
  returns: seedResult,
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await loadSamples(ctx);
  },
});

export const clearSamples = mutation({
  args: {},
  returns: v.object({ athletes: v.number(), sessions: v.number() }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_sample", (q) => q.eq("sample", true))
      .take(100);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_sample", (q) => q.eq("sample", true))
      .take(40);

    for (const athlete of athletes) {
      const rows = await ctx.db
        .query("results")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
        .take(500);
      for (const row of rows) {
        await ctx.db.delete("results", row._id);
      }
    }
    for (const session of sessions) {
      const rows = await ctx.db
        .query("results")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .take(500);
      for (const row of rows) {
        await ctx.db.delete("results", row._id);
      }
      await ctx.db.delete("sessions", session._id);
    }
    for (const athlete of athletes) {
      await ctx.db.delete("athletes", athlete._id);
    }
    return { athletes: athletes.length, sessions: sessions.length };
  },
});
