import { NextRequest, NextResponse } from "next/server";
import type { ReactNode } from "react";
import { setupConvexAuthNextjs } from "@convex-dev/auth/ssr/nextjs";
import { api } from "@convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;

const nextjs = convexUrl
  ? setupConvexAuthNextjs({
      convexUrl,
      refreshSession: api.auth.refreshSession,
      isAuthenticated: api.auth.isAuthenticated,
    })
  : null;

export function convexAuthNextjsProxy(
  handler?: (
    request: NextRequest,
    ctx: { isAuthenticated: () => Promise<boolean> },
  ) => Promise<NextResponse | undefined | void> | NextResponse | undefined | void,
) {
  if (nextjs) return nextjs.convexAuthNextjsProxy(handler);
  return async (request: NextRequest) => {
    const response = await handler?.(request, { isAuthenticated: async () => false });
    return response ?? NextResponse.next();
  };
}

export function nextjsProxyRedirect(request: NextRequest, path: string) {
  if (nextjs) return nextjs.nextjsProxyRedirect(request, path);
  return NextResponse.redirect(new URL(path, request.url));
}

export async function ConvexAuthNextjsServerProvider({ children }: { children: ReactNode }) {
  if (!nextjs) return children;
  return nextjs.ConvexAuthNextjsServerProvider({ children });
}
