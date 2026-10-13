"use client";

import React, { useState } from "react";
import type { DesignConfig, Verse } from "@/types/video";
import { uploadFile } from "@/lib/upload";

const ORIENTATION_BY_FORMAT: Record<DesignConfig["format"], "portrait" | "landscape" | "squarish"> = {
  "9:16": "portrait",
  "16:9": "landscape",
  "1:1": "squarish",
};

export function MediaPanel({
  design,
  onChange,
  verses,
  onVersesChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
  verses: Verse[];
  onVersesChange: (verses: Verse[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [bgLoading, setBgLoading] = useState(false);
  const [bgProgress, setBgProgress] = useState({ done: 0, total: 0 });
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgSkipped, setBgSkipped] = useState(0);

  function patch(partial: Partial<DesignConfig>) {
    onChange({ ...design, ...partial });
  }

  async function fetchBackgroundsForAllVerses() {
    setBgError(null);
    setBgLoading(true);
    setBgSkipped(0);
    setBgProgress({ done: 0, total: verses.length });
    let skipped = 0;
    const orientation = ORIENTATION_BY_FORMAT[design.format];
    const next = [...verses];
    try {
      for (let i = 0; i < next.length; i++) {
        const verse = next[i];
        const text = verse.translation || verse.reference || verse.text;
        const params = new URLSearchParams({ text, orientation });
        const res = await fetch(`/api/background-image?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Échec de la recherche d'image.");
        if (data.url) {
          next[i] = { ...verse, backgroundImageUrl: data.url };
        } else {
          skipped += 1;
        }
        setBgProgress({ done: i + 1, total: next.length });
      }
      onVersesChange(next);
      setBgSkipped(skipped);
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Échec de la recherche d'images.");
    } finally {
      setBgLoading(false);
    }
  }

  async function handleToggleAutoBackground(enabled: boolean) {
    patch({ autoBackgroundEnabled: enabled });
    if (enabled && verses.some((v) => !v.backgroundImageUrl)) {
      await fetchBackgroundsForAllVerses();
    }
  }

  async function handleUpload(key: string, file: File, apply: (url: string) => void) {
    setError(null);
    try {
      const url = await uploadFile(file);
      setFileNames((prev) => ({ ...prev, [key]: file.name }));
      apply(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
    }
  }

  const needsBackgroundMedia = design.background.type === "image" || design.background.type === "video";

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-5">
      <h2 className="font-semibold">Médias</h2>

      <div className="space-y-2 rounded-lg border border-neutral-800 p-3">
        <label className="text-sm text-neutral-200 flex items-center justify-between gap-2">
          <span>Fond automatique par verset (images du web)</span>
          <input
            type="checkbox"
            checked={design.autoBackgroundEnabled ?? false}
            disabled={bgLoading || verses.length === 0}
            onChange={(e) => handleToggleAutoBackground(e.target.checked)}
          />
        </label>
        <p className="text-xs text-neutral-500">
          Pour chaque verset, recherche une image en rapport sur le web (Unsplash) et l&apos;utilise comme
          fond — remplace le fond global défini ci-dessous pour ces slides. Les photos évoquant des
          personnes, l&apos;alcool, le jeu d&apos;argent ou d&apos;autres éléments peu adaptés à un contenu
          religieux musulman sont automatiquement écartées ; un verset sans image appropriée trouvée
          garde simplement le fond global.
        </p>

        {design.autoBackgroundEnabled && (
          <button
            onClick={fetchBackgroundsForAllVerses}
            disabled={bgLoading || verses.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-sm py-2 transition"
          >
            {bgLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Recherche en cours... {bgProgress.done}/{bgProgress.total}
              </>
            ) : (
              "Régénérer les images pour tous les versets"
            )}
          </button>
        )}

        {!bgLoading && bgSkipped > 0 && (
          <p className="text-xs text-amber-400">
            {bgSkipped} verset{bgSkipped > 1 ? "s" : ""} sans image jugée appropriée — fond global conservé
            pour {bgSkipped > 1 ? "ceux-ci" : "celui-ci"}.
          </p>
        )}

        {bgError && (
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-3">
            <p className="text-xs text-red-300 flex items-start gap-2">
              <span aria-hidden>⚠</span> {bgError}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Logo (affiché en haut de chaque slide)</label>
        <div className="flex items-center gap-3">
          {design.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={design.logoUrl}
              alt="Logo"
              className="h-10 w-10 rounded object-contain bg-neutral-950 border border-neutral-800"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] &&
              handleUpload("logo", e.target.files[0], (url) => patch({ logoUrl: url }))
            }
            className="text-sm"
          />
          {design.logoUrl && (
            <button
              onClick={() => patch({ logoUrl: undefined })}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Retirer
            </button>
          )}
        </div>
      </div>

      {needsBackgroundMedia && (
        <div className="space-y-1">
          <label className="text-sm text-neutral-400">
            Fond {design.background.type === "image" ? "(image)" : "(vidéo courte, en boucle)"}
          </label>
          <input
            type="file"
            accept={design.background.type === "image" ? "image/*" : "video/*"}
            onChange={(e) =>
              e.target.files?.[0] &&
              handleUpload("background", e.target.files[0], (url) =>
                patch({ background: { ...design.background, mediaUrl: url } }),
              )
            }
            className="text-sm"
          />
          {design.background.mediaUrl && (
            <p className="text-xs text-emerald-400 truncate">
              ✓ {fileNames.background ?? "Fichier importé"}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Musique de fond</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleUpload("music", e.target.files[0], (url) => patch({ audio: { ...design.audio, musicUrl: url } }))
          }
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-10">Vol.</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={design.audio.musicVolume}
            onChange={(e) => patch({ audio: { ...design.audio, musicVolume: Number(e.target.value) } })}
            className="w-full"
          />
        </div>
        {design.audio.musicUrl && (
          <p className="text-xs text-emerald-400 truncate">✓ {fileNames.music ?? "Fichier importé"}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Ambiance sonore</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleUpload("ambience", e.target.files[0], (url) =>
              patch({ audio: { ...design.audio, ambienceUrl: url } }),
            )
          }
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-10">Vol.</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={design.audio.ambienceVolume}
            onChange={(e) => patch({ audio: { ...design.audio, ambienceVolume: Number(e.target.value) } })}
            className="w-full"
          />
        </div>
        {design.audio.ambienceUrl && (
          <p className="text-xs text-emerald-400 truncate">✓ {fileNames.ambience ?? "Fichier importé"}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-3">
          <p className="text-xs text-red-300 flex items-start gap-2">
            <span aria-hidden>⚠</span> {error}
          </p>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Aucune musique n&apos;est fournie par défaut : importez vos propres fichiers audio libres de droits.
      </p>
    </section>
  );
}
