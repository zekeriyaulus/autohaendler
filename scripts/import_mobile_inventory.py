#!/usr/bin/env python3
"""Import mobile.de inventory export into this project's JSON format.

This script supports two input types:
1) mobile.de Search API JSON response (new JSON format)
2) A simplified 'ads' JSON array you might already have (one object per ad)

It writes:
- src/data/cars.json (list view)
- src/data/cars/<slug>.json (detail view per car)

Usage examples:
  python scripts/import_mobile_inventory.py --input inventory.json --out-dir src/data

Notes:
- To legally obtain machine-readable inventory data, use mobile.de official APIs (Search API / Seller API)
  or export your inventory from the dealer area and convert it to JSON first.
"""

from __future__ import annotations
import argparse, json, os, re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"(^-+|-+$)", "", text) or "fahrzeug"

def pick(d: Dict[str, Any], *keys: str, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur

def normalize_price(v: Any) -> Optional[int]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        v = v.replace("€", "").replace(".", "").replace(" ", "").replace(",", ".")
        try:
            return int(float(v))
        except:
            return None
    return None

def normalize_km(v: Any) -> Optional[int]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        v = v.replace("km", "").replace(".", "").replace(" ", "")
        try:
            return int(v)
        except:
            return None
    return None

def map_ad_to_car(ad: Dict[str, Any]) -> Dict[str, Any]:
    # The official Search API uses many nested structures; we try multiple paths.
    title = (
        pick(ad, "vehicle", "modelDescription") or
        pick(ad, "vehicle", "title") or
        ad.get("title") or
        ad.get("model") or
        "Fahrzeug"
    )
    make = pick(ad, "vehicle", "make") or ad.get("make") or ad.get("manufacturer")
    fuel = pick(ad, "vehicle", "fuel") or ad.get("fuel")
    transmission = pick(ad, "vehicle", "transmission") or ad.get("transmission")
    first_reg = pick(ad, "vehicle", "firstRegistration") or ad.get("firstRegistration") or ad.get("ez")
    mileage = pick(ad, "vehicle", "mileage") or ad.get("mileage") or ad.get("km")
    price = pick(ad, "price", "consumerGross") or pick(ad, "price", "amount") or ad.get("price") or ad.get("preis")
    status = ad.get("status") or ad.get("availability") or "verfügbar"
    images = []
    for p in (pick(ad, "images") or pick(ad, "vehicle", "images") or []):
        if isinstance(p, str):
            images.append(p)
        elif isinstance(p, dict):
            u = p.get("url") or p.get("href")
            if u: images.append(u)

    car_id = str(ad.get("id") or ad.get("adId") or ad.get("mobileAdId") or slugify(title))

    # Put as many details as possible under 'details' without breaking old code
    details = {
        "description": ad.get("description") or pick(ad, "vehicle", "description"),
        "power_kw": pick(ad, "vehicle", "power", "kw") or pick(ad, "vehicle", "powerKw") or ad.get("powerKw"),
        "power_hp": pick(ad, "vehicle", "power", "hp") or pick(ad, "vehicle", "powerHp") or ad.get("powerHp"),
        "cubic_capacity": pick(ad, "vehicle", "cubicCapacity") or ad.get("cubicCapacity"),
        "emission_class": pick(ad, "vehicle", "emissionClass") or ad.get("emissionClass"),
        "co2_g_km": pick(ad, "vehicle", "co2Emission") or ad.get("co2Emission"),
        "consumption": pick(ad, "vehicle", "consumption") or ad.get("consumption"),
        "doors": pick(ad, "vehicle", "doors") or ad.get("doors"),
        "seats": pick(ad, "vehicle", "seats") or ad.get("seats"),
        "color": pick(ad, "vehicle", "color") or ad.get("color"),
        "interior_color": pick(ad, "vehicle", "interiorColor") or ad.get("interiorColor"),
        "features": pick(ad, "vehicle", "features") or ad.get("features"),
        "seller": ad.get("seller") or pick(ad, "contact") or None,
        "source": {
            "provider": "mobile.de",
            "url": ad.get("url") or ad.get("link") or None,
            "imported_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        }
    }

    return {
        "id": car_id,
        "titel": title,
        "hersteller": make,
        "kraftstoff": fuel,
        "getriebe": transmission,
        "preis": normalize_price(price) or 0,
        "km": normalize_km(mileage) or 0,
        "ez": first_reg,
        "status": status,
        "bilder": images,
        "details": details,
    }

def extract_ads(payload: Any) -> List[Dict[str, Any]]:
    # Try common structures
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        for k in ("ads", "items", "results", "vehicles"):
            v = payload.get(k)
            if isinstance(v, list):
                return [x for x in v if isinstance(x, dict)]
        # JSON:API style (data array)
        if isinstance(payload.get("data"), list):
            return [x for x in payload["data"] if isinstance(x, dict)]
    raise SystemExit("Unbekanntes Input-Format. Erwartet Liste oder Objekt mit 'ads/items/results/data'.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Pfad zur JSON Datei mit Inventory/Ads")
    ap.add_argument("--out-dir", default="src/data", help="Ausgabeordner (default: src/data)")
    ap.add_argument("--clear", action="store_true", help="Löscht vorher src/data/cars/*.json")
    args = ap.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.out_dir)
    cars_list_path = out_dir / "cars.json"
    cars_detail_dir = out_dir / "cars"
    cars_detail_dir.mkdir(parents=True, exist_ok=True)

    if args.clear:
        for fp in cars_detail_dir.glob("*.json"):
            fp.unlink()

    payload = json.loads(in_path.read_text(encoding="utf-8"))
    ads = extract_ads(payload)

    cars = [map_ad_to_car(ad) for ad in ads]

    # list view: keep light fields + first image
    list_view = []
    for c in cars:
        list_view.append({
            "id": c["id"],
            "titel": c.get("titel"),
            "hersteller": c.get("hersteller"),
            "kraftstoff": c.get("kraftstoff"),
            "getriebe": c.get("getriebe"),
            "preis": c.get("preis"),
            "km": c.get("km"),
            "ez": c.get("ez"),
            "status": c.get("status"),
            "bilder": c.get("bilder") or [],
        })

    cars_list_path.write_text(json.dumps(list_view, ensure_ascii=False, indent=2), encoding="utf-8")

    for c in cars:
        slug = slugify(c.get("titel") or c["id"])
        (cars_detail_dir / f"{slug}.json").write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"OK: {len(cars)} Fahrzeuge importiert → {cars_list_path} und {cars_detail_dir}/")

if __name__ == "__main__":
    main()
