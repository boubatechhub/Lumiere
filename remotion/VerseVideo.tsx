import React from "react";
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { zoomInOut } from "@remotion/transitions/zoom-in-out";
import type { TransitionPresentation } from "@remotion/transitions";
import {
  DEFAULT_COVER_DURATION_SEC,
  FORMAT_DIMENSIONS,
  calculateTotalDurationInFrames,
  hasCoverContent,
  resolveVerseDurationSec,
} from "../types/video";
import type { DesignConfig, Verse } from "../types/video";
import { CoverSlide } from "./CoverSlide";
import { Slide } from "./Slide";
import { fadedVolume, resolveMediaSrc } from "./utils";

// Type alias (pas interface) : requis pour satisfaire la contrainte
// `Record<string, unknown>` utilisée par les génériques de Remotion
// (Composition, calculateMetadata, Player...).
export type VerseVideoProps = {
  verses: Verse[];
  design: DesignConfig;
};

export const VIDEO_FPS = 30;

// Chaque presentation Remotion a ses propres props ; on efface le type exact
// ici puisque le choix se fait dynamiquement à l'exécution.
function resolvePresentation(design: DesignConfig) {
  switch (design.transition) {
    case "slideLeft":
      return slide({ direction: "from-right" }) as unknown as TransitionPresentation<Record<string, unknown>>;
    case "wipe":
      return wipe() as unknown as TransitionPresentation<Record<string, unknown>>;
    case "zoom":
      return zoomInOut({}) as unknown as TransitionPresentation<Record<string, unknown>>;
    default:
      return fade() as unknown as TransitionPresentation<Record<string, unknown>>;
  }
}

export const calculateVerseVideoMetadata: CalculateMetadataFunction<VerseVideoProps> = ({ props }) => {
  const fps = VIDEO_FPS;
  const { width, height } = FORMAT_DIMENSIONS[props.design.format];
  const durationInFrames = calculateTotalDurationInFrames(props.verses, props.design, fps);
  return { durationInFrames, fps, width, height, props };
};

export const VerseVideo: React.FC<VerseVideoProps> = ({ verses, design }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const transitionFrames = Math.round((design.transitionDurationMs / 1000) * fps);
  const withCover = hasCoverContent(design);
  const coverFrames = Math.round((design.coverDurationSec ?? DEFAULT_COVER_DURATION_SEC) * fps);

  // Position absolue (en frames) de chaque verset dans la vidéo entière —
  // nécessaire pour un minuteur qui décompte la durée totale plutôt que
  // celle du seul verset affiché (useCurrentFrame est local à chaque
  // TransitionSeries.Sequence, pas global). Calcul immuable (pas de
  // réassignation en cours de rendu) : un tableau de durées, puis un
  // tableau de débuts cumulés dérivé par réduction.
  const verseFrames = verses.map((verse) => Math.round(resolveVerseDurationSec(verse, design) * fps));
  const verseStartFrames = verseFrames.reduce<number[]>((starts, frames, i) => {
    const start =
      i === 0
        ? withCover
          ? coverFrames - (verses.length > 0 ? transitionFrames : 0)
          : 0
        : starts[i - 1] + verseFrames[i - 1] - transitionFrames;
    return [...starts, start];
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <TransitionSeries>
        {withCover && (
          <TransitionSeries.Sequence key="cover" durationInFrames={coverFrames}>
            <CoverSlide design={design} durationInFrames={coverFrames} />
          </TransitionSeries.Sequence>
        )}
        {withCover && verses.length > 0 && (
          <TransitionSeries.Transition
            key="cover-transition"
            presentation={resolvePresentation(design)}
            timing={linearTiming({ durationInFrames: transitionFrames })}
          />
        )}
        {verses.flatMap((verse, i) => {
          const frames = verseFrames[i];
          const nodes: React.ReactNode[] = [
            <TransitionSeries.Sequence key={`slide-${verse.id}`} durationInFrames={frames}>
              <Slide
                verse={verse}
                design={design}
                durationInFrames={frames}
                verseStartFrame={verseStartFrames[i]}
                videoDurationInFrames={durationInFrames}
              />
            </TransitionSeries.Sequence>,
          ];
          if (i < verses.length - 1) {
            nodes.push(
              <TransitionSeries.Transition
                key={`transition-${verse.id}`}
                presentation={resolvePresentation(design)}
                timing={linearTiming({ durationInFrames: transitionFrames })}
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>

      {design.audio.musicUrl && (
        <Audio
          src={resolveMediaSrc(design.audio.musicUrl)}
          volume={(f) => fadedVolume(design.audio.musicVolume, f, durationInFrames, fps)}
          pauseWhenBuffering
        />
      )}
      {design.audio.ambienceUrl && (
        <Audio
          src={resolveMediaSrc(design.audio.ambienceUrl)}
          volume={(f) => fadedVolume(design.audio.ambienceVolume, f, durationInFrames, fps)}
          pauseWhenBuffering
        />
      )}
    </AbsoluteFill>
  );
};
