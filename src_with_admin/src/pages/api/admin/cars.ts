import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/pages/api/admin/cars.ts  ->  src/data/cars.json (3 levels up, then ../../data)
const dataPath = path.resolve(__dirname, "../../../data/cars.json");

function isAuthorized(request: Request) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) return true; // Wenn nicht gesetzt, kein Schutz (lokal praktisch)

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

async function readCars(): Promise<any[]> {
  const raw = await fs.readFile(dataPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) return [];
  return data;
}

async function writeCars(cars: any[]): Promise<any[]> {
  // Sicherstellen: Array
  const arr = Array.isArray(cars) ? cars : [];
  // Sortierung optional: verfügbar zuerst, dann Titel
  const rank = (s: any) => (s === "verfügbar" ? 0 : s === "reserviert" ? 1 : 2);
  arr.sort((a, b) => {
    const ra = rank(a?.status);
    const rb = rank(b?.status);
    if (ra !== rb) return ra - rb;
    return String(a?.titel || a?.id || "").localeCompare(String(b?.titel || b?.id || ""), "de");
  });

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(arr, null, 2) + "\n", "utf-8");
  return arr;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const cars = await readCars();
    return new Response(JSON.stringify(cars), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(`Failed to read cars.json: ${e?.message || e}`, { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const body = await request.json();
    const cars = await writeCars(body);
    return new Response(JSON.stringify(cars), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(`Failed to write cars.json: ${e?.message || e}`, { status: 500 });
  }
};
