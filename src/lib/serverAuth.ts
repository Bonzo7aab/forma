import { setupConvexAuthServer } from "@convex-dev/auth/ssr";
import { api } from "@convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;

export const auth = convexUrl
  ? setupConvexAuthServer({
      convexUrl,
      refreshSession: api.auth.refreshSession,
      signOut: api.auth.signOut,
      signIn: [api.auth.signInWithUsernamePassword],
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    })
  : null;
