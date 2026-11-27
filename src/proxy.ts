import { convexAuthNextjsProxy, nextjsProxyRedirect } from "@/lib/convexAuth";

export default convexAuthNextjsProxy(async (request, { isAuthenticated }) => {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin")) {
    const signedIn = await isAuthenticated();
    if (!signedIn) {
      return nextjsProxyRedirect(request, "/logowanie");
    }
  }
  if (path === "/logowanie") {
    const signedIn = await isAuthenticated();
    if (signedIn) {
      return nextjsProxyRedirect(request, "/admin");
    }
  }
});

export const config = {
  matcher: ["/((?!auth(?:/|$)|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
