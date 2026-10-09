"use client";

import React, { useEffect, useState } from "react";
import type { Verse } from "@/types/video";
import { createVerseId } from "@/types/video";

interface ChapterSummary {
  id: number;
  nameArabic: string;
  nameSimple: string;
  translatedName: string;
  versesCount: number;
}

interface TranslationSummary {
  id: number;
  name: string;
  authorName?: string;
}

export function QuranImportPanel({
  onImport,
}: {
  onImport: (verses: Verse[], mode: "replace" | "append") => void;
}) {
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [translations, setTranslations] = useState<TranslationSummary[]>([]);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [fromVerse, setFromVerse] = useState(1);
  const [toVerse, setToVerse] = useState(1);
  const [translationId, setTranslationId] = useState<number | null>(null);
  const [append, setAppend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/quran/chapters").then((res) => res.json()),
      fetch("/api/quran/translations").then((res) => res.json()),
    ])
      .then(([chaptersRes, translationsRes]) => {
        if (chaptersRes.error || translationsRes.error) {
          setLoadError(chaptersRes.error ?? translationsRes.error);
          return;
        }
        setChapters(chaptersRes.chapters);
        setTranslations(translationsRes.translations);
        if (chaptersRes.chapters[0]) setChapterId(chaptersRes.chapters[0].id);
        if (translationsRes.translations[0]) setTranslationId(translationsRes.translations[0].id);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Échec du chargement."));
  }, []);

  const selectedChapter = chapters.find((c) => c.id === chapterId);

  async function handleImport() {
    if (!chapterId || !translationId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        chapter: String(chapterId),
        from: String(fromVerse),
        to: String(toVerse),
        translation: String(translationId),
      });
      const res = await fetch(`/api/quran/verses?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'import.");

      const reference = selectedChapter
        ? `Sourate ${selectedChapter.nameSimple}`
        : `Sourate ${chapterId}`;

      const verses: Verse[] = data.verses.map(
        (v: { verseKey: string; verseNumber: number; textUthmani: string; translation: string }) => ({
          id: createVerseId(),
          text: v.textUthmani,
          translation: v.translation,
          reference: `${reference} • ${v.verseKey}`,
        }),
      );

      onImport(verses, append ? "append" : "replace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'import.");
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 space-y-2">
        <h2 className="font-semibold text-amber-200">Import depuis Quran.com</h2>
        <p className="text-sm text-amber-200/80">{loadError}</p>
        <p className="text-xs text-neutral-400">
          Ajoute QURAN_CLIENT_ID / QURAN_CLIENT_SECRET dans .env.local (voir .env.example) — identifiants
          disponibles sur{" "}
          <a href="https://api-docs.quran.foundation" target="_blank" rel="noreferrer" className="underline">
            api-docs.quran.foundation
          </a>
          , puis relance le serveur.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-4">
      <h2 className="font-semibold">Import depuis Quran.com</h2>
      <p className="text-sm text-neutral-400">
        Choisis une sourate et une plage de versets : le texte arabe et la traduction sont récupérés
        automatiquement.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Sourate</label>
          <select
            value={chapterId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setChapterId(id);
              setFromVerse(1);
              setToVerse(1);
            }}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.translatedName} ({c.nameSimple})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Traduction</label>
          <select
            value={translationId ?? ""}
            onChange={(e) => setTranslationId(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {translations.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.authorName ? ` — ${t.authorName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-400">
            Du verset {selectedChapter ? `(1-${selectedChapter.versesCount})` : ""}
          </label>
          <input
            type="number"
            min={1}
            max={selectedChapter?.versesCount ?? undefined}
            value={fromVerse}
            onChange={(e) => setFromVerse(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-neutral-400">
            Au verset {selectedChapter ? `(1-${selectedChapter.versesCount})` : ""}
          </label>
          <input
            type="number"
            min={1}
            max={selectedChapter?.versesCount ?? undefined}
            value={toVerse}
            onChange={(e) => setToVerse(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          />
        </div>
      </div>

      <label className="text-xs text-neutral-400 flex items-center gap-2">
        <input type="checkbox" checked={append} onChange={(e) => setAppend(e.target.checked)} />
        Ajouter à la suite des versets existants (sinon, les remplace)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleImport}
        disabled={loading || !chapterId || !translationId}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 transition"
      >
        {loading ? "Import en cours..." : "Importer depuis Quran.com"}
      </button>
    </section>
  );
}
