import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

export const viewer = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("users"),
      username: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (user === null) {
      return null;
    }
    const username = await ctx.runQuery(components.authUsername.public.getUsername, {
      userId,
    });
    return { id: user._id, username: username ?? "" };
  },
});
