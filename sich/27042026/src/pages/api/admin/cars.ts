import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";
import seedCars from "../../../data/cars.json";

const STORE_NAME = "carvision-data";
const KEY = "cars.json";

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

function normalizeAndSort(input: any): any[] {
  const arr = Array.isArray(input) ? input : [];

  const rank = (s: any) => (s === "verfügbar" ? 0 : s === "reserviert" ? 1 : 2);
  arr.sort((a, b) => {
    const ra = rank(a?.status);
    const rb = rank(b?.status);
    if (ra !== rb) return ra - rb;
    return String(a?.titel || a?.id || "").localeCompare(String(b?.titel || b?.id || ""), "de");
  });

  return arr;
}

async function getCarsFromBlobs(): Promise<any[]> {
  const store = getStore(STORE_NAME);

  // Erst versuchen aus Blobs zu lesen
  const existing = await store.get(KEY, { type: "json" }).catch(() => null);

  if (existing) return normalizeAndSort(existing);

  // Wenn noch nichts in Blobs ist: Seed aus Repo-JSON übernehmen
  const seeded = normalizeAndSort(seedCars);
  await store.set(KEY, seeded, { contentType: "application/json" });
  return seeded;
}

async function saveCarsToBlobs(cars: any): Promise<any[]> {
  const store = getStore(STORE_NAME);
  const normalized = normalizeAndSort(cars);
  await store.set(KEY, normalized, { contentType: "application/json" });
  return normalized;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const cars = await getCarsFromBlobs();
    return new Response(JSON.stringify(cars), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(`Failed to read cars from Blobs: ${e?.message || e}`, { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const body = await request.json();
    const cars = await saveCarsToBlobs(body);
    return new Response(JSON.stringify(cars), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(`Failed to write cars to Blobs: ${e?.message || e}`, { status: 500 });
  }
};
