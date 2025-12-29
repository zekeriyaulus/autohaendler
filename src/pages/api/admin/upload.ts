import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";

function isAuthorized(request: Request) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
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

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const form = await request.formData();
    const files = form.getAll("files");
    if (!files?.length) {
      return new Response("No files uploaded.", { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const saved: Array<{ filename: string; publicPath: string; bytes: number }> = [];

    for (const item of files) {
      if (!(item instanceof File)) continue;
      const ext = path.extname(item.name).toLowerCase() || ".jpg";
      const safeBase = path
        .basename(item.name, ext)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const filename = `${Date.now()}-${safeBase}${ext}`;
      const arrayBuffer = await item.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);

      const outPath = path.join(uploadsDir, filename);
      await fs.writeFile(outPath, buf);

      saved.push({ filename, publicPath: `/uploads/${filename}`, bytes: buf.byteLength });
    }

    return new Response(JSON.stringify({ files: saved }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(`Upload failed: ${e?.message || e}`, { status: 500 });
  }
};
