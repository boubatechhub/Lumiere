"use client";

import React, { useState } from "react";
import type { DesignConfig } from "@/types/video";
import { uploadFile } from "@/lib/upload";

export function MediaPanel({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  function patch(partial: Partial<DesignConfig>) {
    onChange({ ...design, ...partial });
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
