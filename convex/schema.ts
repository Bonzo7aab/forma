import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const quarter = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
);

export default defineSchema({
  users: defineTable({
    role: v.literal("admin"),
  }),
  athletes: defineTable({
    name: v.string(),
    group: v.string(),
    active: v.boolean(),
    sample: v.boolean(),
  })
    .index("by_active", ["active"])
    .index("by_sample", ["sample"]),
  exercises: defineTable({
    name: v.string(),
    unit: v.string(),
    higherIsBetter: v.boolean(),
    sortOrder: v.number(),
    active: v.boolean(),
  })
    .index("by_order", ["sortOrder"])
    .index("by_active_and_order", ["active", "sortOrder"]),
  sessions: defineTable({
    year: v.number(),
    quarter,
    testedAt: v.number(),
    note: v.string(),
    sample: v.boolean(),
  })
    .index("by_year_and_quarter", ["year", "quarter"])
    .index("by_sample", ["sample"]),
  results: defineTable({
    athleteId: v.id("athletes"),
    exerciseId: v.id("exercises"),
    sessionId: v.id("sessions"),
    value: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_athlete", ["athleteId"])
    .index("by_exercise", ["exerciseId"])
    .index("by_session_and_athlete", ["sessionId", "athleteId"])
    .index("by_athlete_and_exercise", ["athleteId", "exerciseId"]),
});
