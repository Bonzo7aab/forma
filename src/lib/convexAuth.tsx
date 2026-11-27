import { setupConvexAuthNextjs } from "@convex-dev/auth/ssr/nextjs";
import { api } from "@convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Brak NEXT_PUBLIC_CONVEX_URL. Uruchom npx convex dev w katalogu projektu.");
}

export const {
  convexAuthNextjsProxy,
  nextjsProxyRedirect,
  ConvexAuthNextjsServerProvider,
} = setupConvexAuthNextjs({
  convexUrl,
  refreshSession: api.auth.refreshSession,
  isAuthenticated: api.auth.isAuthenticated,
});
