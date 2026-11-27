import { auth } from "@/lib/serverAuth";

export async function POST(request: Request) {
  if (!auth) {
    return new Response("Logowanie nie jest skonfigurowane.", { status: 503 });
  }
  return auth.convexProxyHandler(request);
}
