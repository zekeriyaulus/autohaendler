import { defineMiddleware } from "astro:middleware";

function isAuthorized(request: Request) {
  const user = import.meta.env.ADMIN_USER;
  const pass = import.meta.env.ADMIN_PASS;
  if (!user || !pass) return true;

  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("basic ")) return false;

  const raw = auth.slice(6);
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const [u, p] = decoded.split(":");
    return u === user && p === pass;
  } catch {
    return false;
  }
}

function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Admin"' },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  const protectedPaths = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (protectedPaths && !isAuthorized(context.request)) {
    return unauthorized();
  }

  return next();
});
