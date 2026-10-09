import React from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { zoomInOut } from "@remotion/transitions/zoom-in-out";
import type { TransitionPresentation } from "@remotion/transitions";
import { FORMAT_DIMENSIONS, calculateTotalDurationInFrames, resolveVerseDurationSec } from "../types/video";
import type { DesignConfig, Verse } from "../types/video";
import { Slide } from "./Slide";
import { resolveMediaSrc } from "./utils";

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

function fadedVolume(base: number, frame: number, durationInFrames: number, fps: number) {
  const fadeFrames = Math.min(fps, Math.floor(durationInFrames / 2));
  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return base * Math.min(fadeIn, fadeOut);
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

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <TransitionSeries>
        {verses.flatMap((verse, i) => {
          const frames = Math.round(resolveVerseDurationSec(verse, design) * fps);
          const nodes: React.ReactNode[] = [
            <TransitionSeries.Sequence key={`slide-${verse.id}`} durationInFrames={frames}>
              <Slide verse={verse} design={design} durationInFrames={frames} />
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
        />
      )}
      {design.audio.ambienceUrl && (
        <Audio
          src={resolveMediaSrc(design.audio.ambienceUrl)}
          volume={(f) => fadedVolume(design.audio.ambienceVolume, f, durationInFrames, fps)}
        />
      )}
    </AbsoluteFill>
  );
};
