import { getStore } from "@netlify/blobs";
import seedCars from "../data/cars.json";

const STORE_NAME = "carvision-data";
const KEY = "cars.json";

function normalize(input: any): any[] {
  const arr = Array.isArray(input) ? input : [];
  return arr;
}

/**
 * Read cars from Netlify Blobs when available. Falls back to src/data/cars.json in local dev.
 * Also seeds Blobs with the repo JSON if the store is empty.
 */
export async function getCars(): Promise<any[]> {
  // Fallback first (works everywhere)
  const fallback = normalize(seedCars);

  try {
    const store = getStore(STORE_NAME);
    const existing = await store.get(KEY, { type: "json" }).catch(() => null);
    if (existing) return normalize(existing);

    // Seed once
    await store.set(KEY, fallback, { contentType: "application/json" });
    return fallback;
  } catch {
    // Likely running without Netlify runtime (npm run dev) or missing env — use fallback
    return fallback;
  }
}
