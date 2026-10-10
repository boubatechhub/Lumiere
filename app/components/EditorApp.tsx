"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  FONT_OPTIONS,
  FORMAT_DIMENSIONS,
  calculateTotalDurationInFrames,
  defaultDesign,
  demoProjectArabic,
  type Verse,
  type VideoProject,
} from "@/types/video";
import { VIDEO_FPS, VerseVideo } from "@/remotion/VerseVideo";
import { VersesPanel } from "./VersesPanel";
import { DesignPanel } from "./DesignPanel";
import { MediaPanel } from "./MediaPanel";
import { QuranImportPanel } from "./QuranImportPanel";

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
  const [elapsedSec, setElapsedSec] = useState(0);

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

  useEffect(() => {
    if (renderState.status !== "rendering") return;
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [renderState.status]);

  const { width, height } = FORMAT_DIMENSIONS[project.design.format];
  const durationInFrames = useMemo(
    () => calculateTotalDurationInFrames(project.verses, project.design, VIDEO_FPS),
    [project.verses, project.design],
  );

  async function handleGenerate() {
    setElapsedSec(0);
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

  function handleQuranImport(imported: Verse[], mode: "replace" | "append") {
    setProject((p) => {
      const verses = mode === "append" ? [...p.verses, ...imported] : imported;
      const isArabicFont = FONT_OPTIONS.some((f) => f.family === p.design.mainFontFamily && f.rtl);
      let design = isArabicFont && p.design.mainRTL ? p.design : { ...p.design, mainRTL: true, mainFontFamily: "Amiri", mainFontUrl: undefined };

      // Transitions courtes avec de l'audio synchronisé par verset : une
      // transition trop longue ferait se chevaucher deux récitations.
      const hasAudio = imported.some((v) => v.audioUrl);
      if (hasAudio && design.transitionDurationMs > 200) {
        design = { ...design, transitionDurationMs: 200 };
      }

      return { ...p, verses, design };
    });
  }

  function handleReset() {
    if (project.verses.length > 0) {
      const ok = window.confirm("Repartir d'un projet vierge ? Les versets et réglages actuels seront perdus.");
      if (!ok) return;
    }
    setProject({ verses: [], design: defaultDesign() });
    setRenderState({ status: "idle" });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/branding/logo.png" alt="" width={40} height={40} className="rounded-full" />
          <div>
            <h1 className="text-xl font-semibold">Générateur de vidéos de versets</h1>
            <p className="text-sm text-neutral-400">
              Composez vos versets, personnalisez le rendu, prévisualisez, puis générez.
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-sm rounded-md border border-neutral-800 px-3 py-1.5 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition"
        >
          Nouveau projet
        </button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 p-6 max-w-7xl mx-auto">
        <div className="space-y-6 order-2 lg:order-1">
          <QuranImportPanel onImport={handleQuranImport} />
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
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 transition"
            >
              {renderState.status === "rendering" ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  Génération en cours... {elapsedSec}s
                </>
              ) : (
                "Générer la vidéo"
              )}
            </button>

            {renderState.status === "done" && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 space-y-2">
                <p className="text-sm text-emerald-300 flex items-center gap-2">
                  <span aria-hidden>✓</span> Vidéo générée avec succès.
                </p>
                <a
                  href={renderState.url}
                  download
                  className="block w-full text-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 transition"
                >
                  Télécharger la vidéo
                </a>
              </div>
            )}

            {renderState.status === "error" && (
              <div className="rounded-lg border border-red-900 bg-red-950/40 p-3">
                <p className="text-sm text-red-300 flex items-start gap-2">
                  <span aria-hidden>⚠</span> {renderState.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
