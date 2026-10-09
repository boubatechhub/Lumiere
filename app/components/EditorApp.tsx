"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { FORMAT_DIMENSIONS, calculateTotalDurationInFrames, demoProjectArabic, type VideoProject } from "@/types/video";
import { VIDEO_FPS, VerseVideo } from "@/remotion/VerseVideo";
import { VersesPanel } from "./VersesPanel";
import { DesignPanel } from "./DesignPanel";
import { MediaPanel } from "./MediaPanel";

const STORAGE_KEY = "verset-video-project-draft";

type RenderState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "done"; url: string }
  | { status: "error"; message: string };

export function EditorApp() {
  const [project, setProject] = useState<VideoProject>(() => demoProjectArabic());
  const [hydrated, setHydrated] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>({ status: "idle" });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as VideoProject;
        // Hydratation depuis localStorage après le montage : nécessaire pour
        // éviter un mismatch SSR (le serveur n'a pas accès à localStorage).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (saved?.verses?.length) setProject(saved);
      }
    } catch {
      // brouillon indisponible : on repart du projet de démonstration
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // stockage indisponible (navigation privée...) : on continue sans sauvegarde
    }
  }, [project, hydrated]);

  const { width, height } = FORMAT_DIMENSIONS[project.design.format];
  const durationInFrames = useMemo(
    () => calculateTotalDurationInFrames(project.verses, project.design, VIDEO_FPS),
    [project.verses, project.design],
  );

  async function handleGenerate() {
    setRenderState({ status: "rendering" });
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec du rendu.");
      setRenderState({ status: "done", url: data.url });
    } catch (err) {
      setRenderState({ status: "error", message: err instanceof Error ? err.message : "Erreur inconnue." });
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Générateur de vidéos de versets</h1>
        <p className="text-sm text-neutral-400">
          Composez vos versets, personnalisez le rendu, prévisualisez, puis générez.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 p-6 max-w-7xl mx-auto">
        <div className="space-y-6 order-2 lg:order-1">
          <VersesPanel verses={project.verses} onChange={(verses) => setProject((p) => ({ ...p, verses }))} />
          <DesignPanel design={project.design} onChange={(design) => setProject((p) => ({ ...p, design }))} />
          <MediaPanel design={project.design} onChange={(design) => setProject((p) => ({ ...p, design }))} />
        </div>

        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black flex items-center justify-center">
              {project.verses.length > 0 ? (
                <Player
                  component={VerseVideo}
                  inputProps={{ verses: project.verses, design: project.design }}
                  durationInFrames={durationInFrames}
                  compositionWidth={width}
                  compositionHeight={height}
                  fps={VIDEO_FPS}
                  style={{ width: "100%" }}
                  controls
                  loop
                  acknowledgeRemotionLicense
                />
              ) : (
                <p className="text-sm text-neutral-500 py-20">Ajoutez un verset pour voir l&apos;aperçu.</p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={renderState.status === "rendering" || project.verses.length === 0}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 transition"
            >
              {renderState.status === "rendering" ? "Génération en cours..." : "Générer la vidéo"}
            </button>

            {renderState.status === "done" && (
              <a
                href={renderState.url}
                download
                className="block w-full text-center rounded-lg border border-emerald-500 text-emerald-400 py-3 hover:bg-emerald-500/10 transition"
              >
                Télécharger la vidéo
              </a>
            )}

            {renderState.status === "error" && <p className="text-sm text-red-400">{renderState.message}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
