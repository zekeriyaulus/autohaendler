export const site = {
  name: "CarVision Paderborn",
  tagline: "Gebrauchtwagen • Ankauf • Service",
  // Bitte die echte Domain eintragen, sobald ihr live seid (für Canonical/OG URLs)
  url: "https://example.com",
  locale: "de_DE",
  brandColor: "#c40000",
  address: {
    street: "Hohe Kamp 12",
    zip: "33175",
    city: "Bad Lippspringe",
    country: "Deutschland",
  },
  phones: ["+49 (0)151 40470326", "+49 (0)151 15585266"],

  // Auf dem öffentlichen mobile.de Profil ist keine E-Mail angegeben.
  // Für Kontaktformular/Benachrichtigungen könnt ihr z.B. eine eigene Mail eintragen.
  email: null as string | null,

  // Öffnungszeiten (optional, für Footer/Schema.org)
  openingHours: [
    { days: "Mo–Fr", hours: "09:00–18:00" },
    { days: "Sa", hours: "10:00–14:00" },
  ],

  // Google Maps Query (Adresse reicht)
  mapsQuery: "Hohe Kamp 12, 33175 Bad Lippspringe",

  // Hero Hintergrundbild (vom User genannt): /public/uploads/hintergrund.jpg
  heroBackground: "/uploads/hintergrund.jpg",

  // mobile.de Händler-Slug (für Verlinkung/Einbindung)
  mobileDealerSlug: "ANVERKAUFVONKFZBADLIPPSRINGE",
};

export function telHref(phone: string) {
  // entfernt Leerzeichen/Klammern für tel:
  const cleaned = phone.replace(/\s+/g, "").replace(/[()]/g, "");
  return `tel:${cleaned}`;
}

export function absoluteUrl(pathname: string) {
  const base = site.url.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
