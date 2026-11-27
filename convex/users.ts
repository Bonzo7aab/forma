import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const createUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal("usernamePassword"),
      profile: v.object({}),
    }),
  },
  returns: v.id("users"),
  handler: async () => {
    throw new ConvexError("Rejestracja jest wyłączona.");
  },
});
