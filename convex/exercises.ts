import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/guard";
import { requiredText } from "./lib/text";
import { exerciseView } from "./validators";

function present(exercise: {
  _id: import("./_generated/dataModel").Id<"exercises">;
  name: string;
  unit: string;
  higherIsBetter: boolean;
  sortOrder: number;
  active: boolean;
}) {
  return {
    id: exercise._id,
    name: exercise.name,
    unit: exercise.unit,
    higherIsBetter: exercise.higherIsBetter,
    sortOrder: exercise.sortOrder,
    active: exercise.active,
  };
}

async function ordered(ctx: QueryCtx | MutationCtx) {
  const exercises = await ctx.db.query("exercises").withIndex("by_order").take(50);
  return exercises.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pl"));
}

export const listManage = query({
  args: {},
  returns: v.array(exerciseView),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ordered(ctx)).map(present);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    unit: v.string(),
    higherIsBetter: v.boolean(),
  },
  returns: v.id("exercises"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("exercises").withIndex("by_order").take(50);
    const sortOrder = existing.reduce((max, exercise) => Math.max(max, exercise.sortOrder), -1) + 1;
    return await ctx.db.insert("exercises", {
      name: requiredText(args.name, 2, 80, "Nazwa ćwiczenia"),
      unit: requiredText(args.unit, 1, 16, "Jednostka"),
      higherIsBetter: args.higherIsBetter,
      sortOrder,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.string(),
    unit: v.string(),
    higherIsBetter: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exercise = await ctx.db.get("exercises", args.exerciseId);
    if (exercise === null) {
      throw new ConvexError("Nie znaleziono ćwiczenia.");
    }
    await ctx.db.patch("exercises", exercise._id, {
      name: requiredText(args.name, 2, 80, "Nazwa ćwiczenia"),
      unit: requiredText(args.unit, 1, 16, "Jednostka"),
      higherIsBetter: args.higherIsBetter,
    });
    return null;
  },
});

export const setActive = mutation({
  args: { exerciseId: v.id("exercises"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exercise = await ctx.db.get("exercises", args.exerciseId);
    if (exercise === null) {
      throw new ConvexError("Nie znaleziono ćwiczenia.");
    }
    await ctx.db.patch("exercises", exercise._id, { active: args.active });
    return null;
  },
});

export const move = mutation({
  args: {
    exerciseId: v.id("exercises"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exercises = await ordered(ctx);
    const index = exercises.findIndex((exercise) => exercise._id === args.exerciseId);
    if (index < 0) {
      throw new ConvexError("Nie znaleziono ćwiczenia.");
    }
    const swap = args.direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= exercises.length) {
      return null;
    }
    const next = exercises.slice();
    const [item] = next.splice(index, 1);
    next.splice(swap, 0, item);
    for (let position = 0; position < next.length; position += 1) {
      if (next[position].sortOrder !== position) {
        await ctx.db.patch("exercises", next[position]._id, { sortOrder: position });
      }
    }
    return null;
  },
});

export const remove = mutation({
  args: { exerciseId: v.id("exercises") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const exercise = await ctx.db.get("exercises", args.exerciseId);
    if (exercise === null) {
      throw new ConvexError("Nie znaleziono ćwiczenia.");
    }
    const results = await ctx.db
      .query("results")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", exercise._id))
      .take(500);
    for (const result of results) {
      await ctx.db.delete("results", result._id);
    }
    await ctx.db.delete("exercises", exercise._id);
    return null;
  },
});
