import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import type { DesignConfig } from "../types/video";

/**
 * Minuteur circulaire qui décompte le temps restant de la vidéo entière
 * (pas seulement du verset affiché) : l'anneau se vide progressivement
 * (comme une horloge) et le nombre au centre compte à rebours. `currentFrame`
 * est la position absolue dans la composition — nécessaire car
 * useCurrentFrame() serait local au verset (TransitionSeries.Sequence),
 * pas global. Déterministe, donc identique en aperçu et au rendu final.
 */
export const CountdownTimer: React.FC<{
  design: DesignConfig;
  currentFrame: number;
  totalDurationInFrames: number;
}> = ({ design, currentFrame, totalDurationInFrames }) => {
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height >= width;

  const scale = design.countdownScale ?? 1;
  const size = (isPortrait ? width * 0.14 : height * 0.14) * scale;
  const strokeWidth = size * 0.075;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = interpolate(currentFrame, [0, totalDurationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const remainingSec = Math.max(0, Math.ceil((totalDurationInFrames - currentFrame) / fps));

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={design.textColor}
          strokeOpacity={0.25}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={design.accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * progress}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: design.translationFontFamily,
          fontSize: size * 0.34,
          fontWeight: 700,
          color: design.textColor,
        }}
      >
        {remainingSec}
      </div>
    </div>
  );
};
