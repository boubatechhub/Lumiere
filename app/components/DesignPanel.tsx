"use client";

import React, { useRef, useState } from "react";
import { FONT_OPTIONS, type DesignConfig } from "@/types/video";
import { familyNameFromFile, uploadFile } from "@/lib/upload";

const TEXT_ENTRY_OPTIONS: { value: DesignConfig["textEntry"]; label: string }[] = [
  { value: "fade", label: "Fondu" },
  { value: "slideUp", label: "Glissement vers le haut" },
  { value: "typewriter", label: "Machine à écrire" },
  { value: "wordByWord", label: "Mot par mot" },
];

const TRANSITION_OPTIONS: { value: DesignConfig["transition"]; label: string }[] = [
  { value: "fade", label: "Fondu" },
  { value: "slideLeft", label: "Glissement" },
  { value: "wipe", label: "Balayage" },
  { value: "zoom", label: "Zoom" },
];

const BACKGROUND_TYPE_OPTIONS: { value: DesignConfig["background"]["type"]; label: string }[] = [
  { value: "solid", label: "Uni" },
  { value: "gradient", label: "Dégradé" },
  { value: "image", label: "Image" },
  { value: "video", label: "Vidéo" },
];

export function DesignPanel({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mainFontInput = useRef<HTMLInputElement>(null);
  const translationFontInput = useRef<HTMLInputElement>(null);

  function patch(partial: Partial<DesignConfig>) {
    onChange({ ...design, ...partial });
  }

  async function handleCustomFont(file: File, slot: "main" | "translation") {
    setUploadError(null);
    try {
      const url = await uploadFile(file);
      const family = familyNameFromFile(file);
      if (slot === "main") {
        patch({ mainFontFamily: family, mainFontUrl: url });
      } else {
        patch({ translationFontFamily: family, translationFontUrl: url });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec de l'upload de la police.");
    }
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-5">
      <h2 className="font-semibold">Design</h2>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Format</label>
        <div className="grid grid-cols-3 gap-2">
          {(["9:16", "1:1", "16:9"] as const).map((format) => (
            <button
              key={format}
              onClick={() => patch({ format })}
              className={`rounded-md border px-3 py-2 text-sm ${
                design.format === format
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Fond</label>
        <div className="flex gap-2">
          {BACKGROUND_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => patch({ background: { ...design.background, type: value } })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                design.background.type === value
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-xs text-neutral-400 flex items-center gap-2">
            Couleur 1
            <input
              type="color"
              value={design.background.colors[0] ?? "#000000"}
              onChange={(e) =>
                patch({
                  background: {
                    ...design.background,
                    colors: [e.target.value, design.background.colors[1] ?? e.target.value],
                  },
                })
              }
            />
          </label>
          {design.background.type === "gradient" && (
            <label className="text-xs text-neutral-400 flex items-center gap-2">
              Couleur 2
              <input
                type="color"
                value={design.background.colors[1] ?? "#000000"}
                onChange={(e) =>
                  patch({
                    background: {
                      ...design.background,
                      colors: [design.background.colors[0] ?? e.target.value, e.target.value],
                    },
                  })
                }
              />
            </label>
          )}
          {(design.background.type === "image" || design.background.type === "video") && (
            <label className="text-xs text-neutral-400 flex items-center gap-2">
              <input
                type="checkbox"
                checked={design.background.kenBurns ?? false}
                onChange={(e) =>
                  patch({ background: { ...design.background, kenBurns: e.target.checked } })
                }
              />
              Effet zoom lent (Ken Burns)
            </label>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          L&apos;import de l&apos;image/vidéo de fond se fait dans le panneau « Médias » ci-dessous.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs text-neutral-400 flex items-center gap-2">
          Couleur du texte
          <input type="color" value={design.textColor} onChange={(e) => patch({ textColor: e.target.value })} />
        </label>
        <label className="text-xs text-neutral-400 flex items-center gap-2">
          Couleur d&apos;accent
          <input type="color" value={design.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} />
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Police du verset</label>
        <div className="flex gap-2">
          <select
            value={design.mainFontUrl ? "" : design.mainFontFamily}
            onChange={(e) => {
              const font = FONT_OPTIONS.find((f) => f.family === e.target.value);
              if (font) patch({ mainFontFamily: font.family, mainFontUrl: undefined, mainRTL: font.rtl });
            }}
            className="flex-1 rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {design.mainFontUrl && <option value="">Police personnalisée</option>}
            {FONT_OPTIONS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => mainFontInput.current?.click()}
            className="rounded-md border border-neutral-800 px-3 text-sm hover:border-neutral-700"
          >
            Importer...
          </button>
          <input
            ref={mainFontInput}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCustomFont(e.target.files[0], "main")}
          />
        </div>
        <label className="text-xs text-neutral-400 flex items-center gap-2">
          <input type="checkbox" checked={design.mainRTL} onChange={(e) => patch({ mainRTL: e.target.checked })} />
          Texte du verset en RTL (arabe, hébreu...)
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-400">Police de la traduction</label>
        <div className="flex gap-2">
          <select
            value={design.translationFontUrl ? "" : design.translationFontFamily}
            onChange={(e) => {
              const font = FONT_OPTIONS.find((f) => f.family === e.target.value);
              if (font) patch({ translationFontFamily: font.family, translationFontUrl: undefined });
            }}
            className="flex-1 rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {design.translationFontUrl && <option value="">Police personnalisée</option>}
            {FONT_OPTIONS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => translationFontInput.current?.click()}
            className="rounded-md border border-neutral-800 px-3 text-sm hover:border-neutral-700"
          >
            Importer...
          </button>
          <input
            ref={translationFontInput}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCustomFont(e.target.files[0], "translation")}
          />
        </div>
      </div>

      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Animation du texte</label>
          <select
            value={design.textEntry}
            onChange={(e) => patch({ textEntry: e.target.value as DesignConfig["textEntry"] })}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {TEXT_ENTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Transition entre versets</label>
          <select
            value={design.transition}
            onChange={(e) => patch({ transition: e.target.value as DesignConfig["transition"] })}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          >
            {TRANSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">
          Durée des transitions : {design.transitionDurationMs} ms
        </label>
        <input
          type="range"
          min={100}
          max={1500}
          step={50}
          value={design.transitionDurationMs}
          onChange={(e) => patch({ transitionDurationMs: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400 flex items-center gap-2">
          <input
            type="checkbox"
            checked={design.secondsPerVerse === "auto"}
            onChange={(e) => patch({ secondsPerVerse: e.target.checked ? "auto" : 5 })}
          />
          Durée par verset automatique (selon la longueur du texte)
        </label>
        {design.secondsPerVerse !== "auto" && (
          <input
            type="number"
            min={1}
            max={30}
            value={design.secondsPerVerse}
            onChange={(e) => patch({ secondsPerVerse: Number(e.target.value) })}
            className="w-32 rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          value={design.pageName ?? ""}
          onChange={(e) => patch({ pageName: e.target.value })}
          placeholder="Nom de la page (en-tête)"
          className="rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
        />
        <input
          value={design.attribution ?? ""}
          onChange={(e) => patch({ attribution: e.target.value })}
          placeholder="Attribution (bas de vidéo)"
          className="rounded-md bg-neutral-950 border border-neutral-800 p-2 text-sm"
        />
      </div>

      <label className="text-xs text-neutral-400 flex items-center gap-2">
        <input
          type="checkbox"
          checked={design.showReference}
          onChange={(e) => patch({ showReference: e.target.checked })}
        />
        Afficher la référence / l&apos;en-tête
      </label>
    </section>
  );
}
