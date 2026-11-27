import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/guard";
import { optionalText, requiredText } from "./lib/text";
import { athleteView } from "./validators";

function present(athlete: {
  _id: import("./_generated/dataModel").Id<"athletes">;
  name: string;
  group: string;
  active: boolean;
  sample: boolean;
}) {
  return {
    id: athlete._id,
    name: athlete.name,
    group: athlete.group,
    active: athlete.active,
    sample: athlete.sample,
  };
}

export const listManage = query({
  args: {},
  returns: v.array(athleteView),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const active = await ctx.db
      .query("athletes")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(100);
    const hidden = await ctx.db
      .query("athletes")
      .withIndex("by_active", (q) => q.eq("active", false))
      .take(100);
    return [...active, ...hidden]
      .map(present)
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  },
});

export const create = mutation({
  args: { name: v.string(), group: v.string() },
  returns: v.id("athletes"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("athletes", {
      name: requiredText(args.name, 2, 80, "Imię i nazwisko"),
      group: optionalText(args.group, 40, "Grupa"),
      active: true,
      sample: false,
    });
  },
});

export const update = mutation({
  args: {
    athleteId: v.id("athletes"),
    name: v.string(),
    group: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (athlete === null) {
      throw new ConvexError("Nie znaleziono podopiecznego.");
    }
    await ctx.db.patch("athletes", athlete._id, {
      name: requiredText(args.name, 2, 80, "Imię i nazwisko"),
      group: optionalText(args.group, 40, "Grupa"),
    });
    return null;
  },
});

export const setActive = mutation({
  args: { athleteId: v.id("athletes"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (athlete === null) {
      throw new ConvexError("Nie znaleziono podopiecznego.");
    }
    await ctx.db.patch("athletes", athlete._id, { active: args.active });
    return null;
  },
});
