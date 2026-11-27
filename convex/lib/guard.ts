import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Wymagane logowanie.");
  }
  const user = await ctx.db.get("users", userId);
  if (user === null || user.role !== "admin") {
    throw new ConvexError("Brak uprawnień administratora.");
  }
  return user;
}
