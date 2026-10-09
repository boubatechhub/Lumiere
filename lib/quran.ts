import "server-only";
import { Language } from "@quranjs/api";
import { createServerClient } from "@quranjs/api/server";
import type { VerseKey } from "@quranjs/api";

let cachedClient: ReturnType<typeof createServerClient> | null = null;

function getClient() {
  const clientId = process.env.QURAN_CLIENT_ID;
  const clientSecret = process.env.QURAN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "QURAN_CLIENT_ID / QURAN_CLIENT_SECRET manquants. Crée des identifiants sur " +
        "https://api-docs.quran.foundation puis ajoute-les dans .env.local (voir .env.example).",
    );
  }
  if (!cachedClient) {
    cachedClient = createServerClient({
      clientId,
      clientSecret,
      defaults: { language: Language.FRENCH },
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
  const translations = await client.resources.findAllTranslations({ language: Language.FRENCH });
  return translations
    .filter((t): t is typeof t & { id: number; name: string } => typeof t.id === "number" && Boolean(t.name))
    .map((t) => ({ id: t.id, name: t.name, authorName: t.authorName }));
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
}

export async function fetchQuranVerses(options: {
  chapterId: number;
  fromVerse: number;
  toVerse: number;
  translationId: number;
}): Promise<QuranImportedVerse[]> {
  const client = getClient();
  const from = `${options.chapterId}:${options.fromVerse}` as VerseKey;
  const to = `${options.chapterId}:${options.toVerse}` as VerseKey;

  const verses = await client.verses.findByRange(from, to, {
    translations: [options.translationId],
    fields: { textUthmani: true },
  });

  return verses.map((verse) => ({
    verseKey: verse.verseKey,
    verseNumber: verse.verseNumber,
    textUthmani: verse.textUthmani ?? "",
    translation: stripHtml(verse.translations?.[0]?.text ?? ""),
  }));
}
