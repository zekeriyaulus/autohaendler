## mobile.de → cars.json Import

Du wolltest, dass alle Fahrzeuge aus der mobile.de Händlerseite in `cars.json` (und mit Detail-Infos pro Fahrzeug) landen.

**Wichtig:** Die öffentliche `home.mobile.de/...` Seite lädt den Fahrzeugbestand per JavaScript nach. Ohne offizielle API-Daten oder einen Export aus dem Händlerbereich kann ich hier nicht zuverlässig und rechtssicher *alle* Fahrzeuge samt Details automatisiert auslesen.

### Empfohlener Weg (sauber & stabil)
1. Nutze die offiziellen mobile.de APIs (Search API / Seller API) oder exportiere den Bestand aus dem Händlerbereich.
2. Speichere die API-Antwort / Exportdaten als `inventory.json`.
3. Führe den Import aus:

```bash
python scripts/import_mobile_inventory.py --input inventory.json --out-dir src/data --clear
```

Ergebnis:
- `src/data/cars.json` (Liste)
- `src/data/cars/<slug>.json` (Details)

### Welche Felder werden übernommen?
Das Script schreibt die bisherigen Felder (damit die Seite weiter funktioniert) und packt zusätzliche Detaildaten unter `details`:
- description, Leistung (kW/PS), Hubraum, Emission, Verbrauch, Farbe, Ausstattung, etc. (falls vorhanden)

Wenn du mir einen Export / API-JSON hier hochlädst, kann ich dir `cars.json` + alle Detail-JSONs bereits fertig generieren.
