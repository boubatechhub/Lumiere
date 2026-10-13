import "server-only";

const FRENCH_STOPWORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "et", "ou", "que", "qui", "quoi",
  "dans", "pour", "sur", "avec", "sans", "ne", "pas", "ni", "est", "sont", "il", "elle", "ils",
  "elles", "ce", "cet", "cette", "ces", "au", "aux", "se", "sa", "son", "ses", "leur", "leurs",
  "nous", "vous", "par", "plus", "moins", "où", "comme", "aussi", "tout", "tous", "toute",
  "toutes", "mais", "donc", "or", "car", "en", "à", "a", "y", "qu", "s", "n", "j", "si", "ainsi",
  "lui", "ton", "ta", "tes", "mon", "ma", "mes", "leur", "eux", "soi", "toi", "moi",
]);

/**
 * Extrait quelques mots-clés évocateurs d'une traduction pour servir de
 * requête de recherche d'image (filtre les mots outils français courants).
 */
export function deriveImageQuery(text: string, fallback: string): string {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FRENCH_STOPWORDS.has(w));

  const keywords = Array.from(new Set(words)).slice(0, 5);
  if (keywords.length === 0) return fallback;
  return keywords.join(" ");
}

export interface BackgroundImageResult {
  url: string;
  downloadLocation?: string;
}

// Le contenu est destiné à accompagner des versets : on écarte toute photo
// dont la description/les tags évoquent des personnes, de l'immodestie, de
// l'alcool, du jeu d'argent, du porc, ou des symboles d'autres religions —
// même si elle correspond visuellement au mot-clé recherché. On ne se fie
// jamais au premier résultat sans ce filtre.
const DISALLOWED_IMAGE_TERMS = [
  "person", "people", "man", "men", "woman", "women", "girl", "boy", "child", "kid", "baby",
  "face", "portrait", "model", "couple", "bride", "groom", "wedding", "selfie", "crowd", "human",
  "nude", "naked", "topless", "bikini", "swimsuit", "lingerie", "underwear", "skin",
  "alcohol", "beer", "wine", "cocktail", "bar", "pub", "nightclub", "party", "drunk",
  "pork", "bacon", "pig",
  "casino", "gambling", "poker",
  "cross", "crucifix", "church", "christmas", "santa", "buddha", "buddhist", "hindu", "synagogue",
  "tattoo", "lgbt", "pride flag",
] as const;

interface UnsplashPhoto {
  urls?: { regular?: string };
  links?: { download_location?: string };
  description?: string | null;
  alt_description?: string | null;
  tags?: Array<{ title?: string }>;
}

function isImageAppropriate(photo: UnsplashPhoto): boolean {
  const haystack = [photo.description, photo.alt_description, ...(photo.tags ?? []).map((t) => t.title)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return !DISALLOWED_IMAGE_TERMS.some((term) => haystack.includes(term));
}

export async function searchBackgroundImage(
  query: string,
  orientation: "portrait" | "landscape" | "squarish",
): Promise<BackgroundImageResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error(
      "UNSPLASH_ACCESS_KEY manquant. Crée une app gratuite sur https://unsplash.com/developers " +
        "puis ajoute la clé dans .env.local (voir .env.example).",
    );
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("orientation", orientation);
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!res.ok) {
    throw new Error(`Unsplash a répondu avec une erreur (${res.status}).`);
  }

  const data = await res.json();
  const candidates: UnsplashPhoto[] = data.results ?? [];
  // On prend la première image à la fois pertinente ET jugée appropriée,
  // jamais juste la première correspondance visuelle.
  const photo = candidates.find((p) => p.urls?.regular && isImageAppropriate(p));
  if (!photo?.urls?.regular) return null;

  return { url: photo.urls.regular, downloadLocation: photo.links?.download_location };
}

/** Signale à Unsplash qu'une photo a été utilisée (conforme à leurs CGU API). */
export async function trackDownload(downloadLocation: string): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return;
  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
  } catch {
    // best-effort : ne doit jamais bloquer l'utilisateur
  }
}
