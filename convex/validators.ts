import { v } from "convex/values";

export const quarterValue = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
);

export const athleteView = v.object({
  id: v.id("athletes"),
  name: v.string(),
  group: v.string(),
  active: v.boolean(),
  sample: v.boolean(),
});

export const exerciseView = v.object({
  id: v.id("exercises"),
  name: v.string(),
  unit: v.string(),
  higherIsBetter: v.boolean(),
  sortOrder: v.number(),
  active: v.boolean(),
});

export const sessionView = v.object({
  id: v.id("sessions"),
  year: v.number(),
  quarter: quarterValue,
  testedAt: v.number(),
  note: v.string(),
  sample: v.boolean(),
});

export const resultView = v.object({
  id: v.id("results"),
  athleteId: v.id("athletes"),
  exerciseId: v.id("exercises"),
  sessionId: v.id("sessions"),
  value: v.number(),
});
