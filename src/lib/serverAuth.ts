import { setupConvexAuthServer } from "@convex-dev/auth/ssr";
import { api } from "@convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Brak NEXT_PUBLIC_CONVEX_URL. Uruchom npx convex dev w katalogu projektu.");
}

export const auth = setupConvexAuthServer({
  convexUrl,
  refreshSession: api.auth.refreshSession,
  signOut: api.auth.signOut,
  signIn: [api.auth.signInWithUsernamePassword, api.auth.signUpWithUsernamePassword],
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
});
