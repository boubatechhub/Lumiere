import "server-only";
import { Language } from "@quranjs/api";
import { createServerClient } from "@quranjs/api/server";
import type { ChapterId, Segment, VerseKey } from "@quranjs/api";

let cachedClient: ReturnType<typeof createServerClient> | null = null;

// Quran Foundation a deux environnements séparés avec des identifiants et des
// URLs distincts ; les nouveaux comptes développeur reçoivent par défaut des
// identifiants "pré-production" (l'accès production se demande à part). Le
// SDK pointe par défaut vers production, d'où un 401 si on ne force pas les
// URLs pré-production ici. Repasse QURAN_API_ENV=production une fois l'accès
// production obtenu (identifiants ET URLs doivent changer ensemble).
const QURAN_PRELIVE_SERVICES = {
  gatewayUrl: "https://apis-prelive.quran.foundation",
  oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
};

function getClient() {
  const clientId = process.env.QURAN_CLIENT_ID;
  const clientSecret = process.env.QURAN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "QURAN_CLIENT_ID / QURAN_CLIENT_SECRET manquants. Crée des identifiants sur " +
        "https://api-docs.quran.foundation puis ajoute-les dans .env.local (voir .env.example).",
    );
  }
  const isProduction = process.env.QURAN_API_ENV === "production";
  if (!cachedClient) {
    cachedClient = createServerClient({
      clientId,
      clientSecret,
      defaults: { language: Language.FRENCH },
      ...(isProduction ? {} : { services: QURAN_PRELIVE_SERVICES }),
    });
  }
  return cachedClient;
}

export interface QuranChapterSummary {
  id: number;
  nameArabic: string;
  nameSimple: string;
  translatedName: string;
  versesCount: number;
}

export async function listQuranChapters(): Promise<QuranChapterSummary[]> {
  const client = getClient();
  const chapters = await client.chapters.findAll();
  return chapters
    .map((chapter) => ({
      id: chapter.id,
      nameArabic: chapter.nameArabic,
      nameSimple: chapter.nameSimple,
      translatedName: chapter.translatedName?.name ?? chapter.nameSimple,
      versesCount: chapter.versesCount,
    }))
    .sort((a, b) => a.id - b.id);
}

export interface QuranTranslationSummary {
  id: number;
  name: string;
  authorName?: string;
}

export async function listFrenchTranslations(): Promise<QuranTranslationSummary[]> {
  const client = getClient();
  // Le paramètre `language` de l'API ne filtre pas réellement la liste (elle
  // renvoie un mélange de langues quoi qu'il arrive) : on filtre nous-mêmes
  // sur `languageName`, seul champ fiable pour isoler le français.
  const translations = await client.resources.findAllTranslations();
  return translations
    .filter(
      (t): t is typeof t & { id: number; name: string } =>
        typeof t.id === "number" && Boolean(t.name) && t.languageName?.toLowerCase() === "french",
    )
    .map((t) => ({ id: t.id, name: t.name, authorName: t.authorName }));
}

export interface QuranReciterSummary {
  id: number;
  name: string;
  style?: string;
}

export async function listReciters(): Promise<QuranReciterSummary[]> {
  const client = getClient();
  const recitations = await client.resources.findAllRecitations();
  return recitations
    .filter((r): r is typeof r & { id: number } => typeof r.id === "number")
    .map((r) => ({
      id: r.id,
      name: r.translatedName?.name ?? r.reciterName ?? `Récitateur ${r.id}`,
      style: r.style,
    }));
}

function stripHtml(html: string): string {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface QuranImportedVerse {
  verseKey: string;
  verseNumber: number;
  textUthmani: string;
  translation: string;
  audioUrl?: string;
  /** Durée du clip de récitation (secondes), déduite des segments de timing. */
  durationSec?: number;
}

export async function fetchQuranVerses(options: {
  chapterId: number;
  fromVerse: number;
  toVerse: number;
  translationId: number;
  reciterId?: number;
}): Promise<QuranImportedVerse[]> {
  const client = getClient();
  const from = `${options.chapterId}:${options.fromVerse}` as VerseKey;
  const to = `${options.chapterId}:${options.toVerse}` as VerseKey;

  const [verses, recitation] = await Promise.all([
    client.verses.findByRange(from, to, {
      translations: [options.translationId],
      fields: { textUthmani: true },
    }),
    options.reciterId
      ? client.audio.findVerseRecitationsByChapter(options.chapterId as ChapterId, String(options.reciterId), {
          fields: { segments: true },
        })
      : null,
  ]);

  const audioByVerseKey = new Map<string, { audioUrl: string; segments?: Segment[] }>();
  if (recitation) {
    for (const file of recitation.audioFiles) {
      if (file.audioUrl) audioByVerseKey.set(file.verseKey, { audioUrl: file.audioUrl, segments: file.segments });
    }
  }

  return verses.map((verse) => {
    const audio = audioByVerseKey.get(verse.verseKey);
    const lastSegment = audio?.segments?.[audio.segments.length - 1];
    // timeTo du dernier segment de timing = fin de la récitation (ms) ; marge
    // de 300ms pour ne pas couper la fin de la voix.
    const durationSec = lastSegment ? lastSegment[3] / 1000 + 0.3 : undefined;

    return {
      verseKey: verse.verseKey,
      verseNumber: verse.verseNumber,
      textUthmani: verse.textUthmani ?? "",
      translation: stripHtml(verse.translations?.[0]?.text ?? ""),
      audioUrl: audio?.audioUrl,
      durationSec,
    };
  });
}
