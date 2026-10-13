import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import type { DesignConfig } from "../types/video";
import { Background } from "./Background";
import { ensureFontLoaded } from "./fonts";
import { resolveMediaSrc } from "./utils";

/**
 * Écran de couverture (logo + nom de page), tout premier contenu de la vidéo :
 * pleinement visible dès la frame 0 (pas de fondu d'entrée propre à ce
 * composant — la transition de sortie vers le premier verset est déjà gérée
 * par le <TransitionSeries.Transition> dans VerseVideo).
 */
export const CoverSlide: React.FC<{
  design: DesignConfig;
  durationInFrames: number;
}> = ({ design, durationInFrames }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height >= width;

  ensureFontLoaded(design.translationFontFamily, design.translationFontUrl);

  const logoScale = design.coverLogoScale ?? 1;
  const titleScale = design.coverTitleScale ?? 1;

  const logoSize = (isPortrait ? width * 0.32 : height * 0.3) * logoScale;
  const titleFontSize = (isPortrait ? width * 0.075 : height * 0.095) * titleScale;

  return (
    <AbsoluteFill>
      <Background background={design.background} durationInFrames={durationInFrames} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          color: design.textColor,
          textAlign: "center",
        }}
      >
        {design.logoUrl && (
          <Img
            src={resolveMediaSrc(design.logoUrl)}
            style={{ width: logoSize, height: logoSize, borderRadius: "50%", objectFit: "cover" }}
          />
        )}
        {design.pageName && (
          <div
            style={{
              fontFamily: design.translationFontFamily,
              fontSize: titleFontSize,
              fontWeight: 700,
              maxWidth: "88%",
            }}
          >
            {design.pageName}
          </div>
        )}
        {design.attribution && (
          <div
            style={{
              fontFamily: design.translationFontFamily,
              fontSize: titleFontSize * 0.32,
              opacity: 0.75,
            }}
          >
            {design.attribution}
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.25), transparent 30%)" }} />
    </AbsoluteFill>
  );
};
