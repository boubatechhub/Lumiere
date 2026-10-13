import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_TRANSLATION_LINE_HEIGHT, DEFAULT_VERSE_LINE_HEIGHT } from "../types/video";
import type { DesignConfig, Verse } from "../types/video";
import { Background } from "./Background";
import { CountdownTimer } from "./CountdownTimer";
import { ensureFontLoaded } from "./fonts";
import { fadedVolume, resolveMediaSrc } from "./utils";

/**
 * Réduit une taille de police en fonction de la longueur du texte, pour que
 * les versets/traductions longs restent dans le cadre au lieu de déborder.
 * Mise à l'échelle heuristique (pas de mesure DOM réelle) : déterministe,
 * donc identique en aperçu et au rendu final.
 */
function fitFontSize(baseSize: number, textLength: number, idealLength: number, minScale: number): number {
  if (textLength <= idealLength) return baseSize;
  const scale = Math.pow(idealLength / textLength, 0.55);
  return baseSize * Math.max(minScale, scale);
}

function WordByWord({
  text,
  revealedCount,
}: {
  text: string;
  revealedCount: number;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i} style={{ opacity: i < revealedCount ? 1 : 0 }}>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export const Slide: React.FC<{
  verse: Verse;
  design: DesignConfig;
  durationInFrames: number;
  /** Frame absolue de début de ce verset dans la vidéo entière (minuteur global). */
  verseStartFrame: number;
  /** Durée totale de la vidéo entière en frames (minuteur global). */
  videoDurationInFrames: number;
}> = ({ verse, design, durationInFrames, verseStartFrame, videoDurationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  ensureFontLoaded(design.mainFontFamily, design.mainFontUrl);
  ensureFontLoaded(design.translationFontFamily, design.translationFontUrl);

  const isPortrait = height >= width;
  const verseTextScale = design.verseTextScale ?? 1;
  const translationTextScale = design.translationTextScale ?? 1;
  const verseLineHeight = design.verseLineHeight ?? DEFAULT_VERSE_LINE_HEIGHT;
  const translationLineHeight = design.translationLineHeight ?? DEFAULT_TRANSLATION_LINE_HEIGHT;
  const marginScale = design.marginScale ?? 1;
  const logoScaleFactor = design.logoScale ?? 1;

  const baseMainFontSize = isPortrait ? width * 0.09 : height * 0.14;
  const baseTranslationFontSize = baseMainFontSize * 0.42;
  const metaFontSize = baseMainFontSize * 0.22 * translationTextScale;

  // Versets/traductions longs : taille réduite pour rester dans le cadre ;
  // puis on applique le réglage utilisateur (taille + interligne) par-dessus,
  // indépendamment pour le verset et pour la traduction.
  const mainFontSize = fitFontSize(baseMainFontSize, verse.text.length, 45, 0.55) * verseTextScale;
  const translationFontSize =
    fitFontSize(baseTranslationFontSize, verse.translation.length, 70, 0.55) * translationTextScale;
  const isLongContent = verse.text.length > 90 || verse.translation.length > 140;
  const contentGap = (isPortrait ? 32 : 24) * (isLongContent ? 0.5 : 1);

  const transitionFrames = Math.round((design.transitionDurationMs / 1000) * fps);

  const hasLogo = Boolean(design.logoUrl);
  // Logo aligné sur la même ligne que les textes d'en-tête (pageName / référence).
  const headerLogoHeight = metaFontSize * 6.4 * logoScaleFactor;
  const hasHeaderText = design.showReference && Boolean(design.pageName || verse.reference);
  const showHeaderRow = hasLogo || hasHeaderText;

  // Marges : pourcentages de base par format, ajustables via design.marginScale.
  const headerInset = 7 * marginScale;
  const paddingTopPct = (isPortrait ? 14 : 13) * marginScale;
  const paddingBottomPct = (isPortrait ? 8 : 6) * marginScale;
  const paddingHorizontalPct = (isPortrait ? 6 : 12) * marginScale;

  const entryFrames = Math.min(20, Math.max(6, durationInFrames - 4));
  const entryProgress = spring({ frame, fps, config: { damping: 200 }, durationInFrames: entryFrames });

  let mainOpacity: number = entryProgress;
  let mainTransform = "none";
  let mainNode: React.ReactNode = verse.text;
  let translationOpacity = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  let translationNode: React.ReactNode = verse.translation;

  if (design.textEntry === "slideUp") {
    mainTransform = `translateY(${interpolate(entryProgress, [0, 1], [40, 0])}px)`;
  } else if (design.textEntry === "typewriter") {
    const charsPerSecond = 18;
    const charCount = Math.floor((frame / fps) * charsPerSecond);
    mainNode = verse.text.slice(0, charCount);
    mainOpacity = 1;
    const mainDoneAtFrame = Math.ceil((verse.text.length / charsPerSecond) * fps);
    translationOpacity = interpolate(frame, [mainDoneAtFrame, mainDoneAtFrame + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (design.textEntry === "wordByWord") {
    const wordsPerSecond = 2.4;
    const revealedCount = Math.floor((frame / fps) * wordsPerSecond);
    translationNode = <WordByWord text={verse.translation} revealedCount={revealedCount} />;
    translationOpacity = 1;
  }

  // Image de fond spécifique au verset (recherche web automatique), prioritaire
  // sur le fond global quand l'option est activée.
  const slideBackground =
    design.autoBackgroundEnabled && verse.backgroundImageUrl
      ? { type: "image" as const, colors: design.background.colors, mediaUrl: verse.backgroundImageUrl, kenBurns: design.background.kenBurns ?? true }
      : design.background;

  return (
    <AbsoluteFill>
      <Background background={slideBackground} durationInFrames={durationInFrames} />

      {/* pauseWhenBuffering : évite que l'aperçu en direct se désynchronise en
          changeant de verset avant que son clip audio distant ait fini de
          charger — il met en pause le temps que l'audio soit prêt plutôt que
          de dériver. Sans effet sur le rendu final (déjà frame-exact).
          Le fondu (sur la durée de la transition) évite que deux récitations
          se chevauchent à pleine puissance pendant le crossfade visuel entre
          deux versets — TransitionSeries.Transition superpose la fin d'une
          séquence et le début de la suivante. */}
      {verse.audioUrl && (
        <Audio
          src={resolveMediaSrc(verse.audioUrl)}
          volume={(f) => fadedVolume(1, f, durationInFrames, fps, transitionFrames)}
          pauseWhenBuffering
        />
      )}

      {showHeaderRow && (
        <div
          style={{
            position: "absolute",
            top: `${headerInset}%`,
            left: `${headerInset}%`,
            right: `${headerInset}%`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            color: design.textColor,
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: design.translationFontFamily,
              fontSize: metaFontSize,
              opacity: 0.85,
            }}
          >
            {design.pageName}
          </span>
          {hasLogo && (
            <Img
              src={resolveMediaSrc(design.logoUrl as string)}
              style={{
                height: headerLogoHeight,
                width: headerLogoHeight,
                maxWidth: "28%",
                objectFit: "cover",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              flex: 1,
              textAlign: "right",
              fontFamily: design.translationFontFamily,
              fontSize: metaFontSize,
              opacity: 0.85,
            }}
          >
            {verse.reference}
          </span>
        </div>
      )}

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: contentGap,
          paddingTop: `${paddingTopPct}%`,
          paddingBottom: `${paddingBottomPct}%`,
          paddingLeft: `${paddingHorizontalPct}%`,
          paddingRight: `${paddingHorizontalPct}%`,
          color: design.textColor,
        }}
      >
        <div
          dir={design.mainRTL ? "rtl" : "ltr"}
          style={{
            fontFamily: design.mainFontFamily,
            fontSize: mainFontSize,
            lineHeight: verseLineHeight,
            textAlign: "center",
            color: design.verseTextColor ?? design.textColor,
            opacity: mainOpacity,
            transform: mainTransform,
            unicodeBidi: "plaintext",
          }}
        >
          {mainNode}
        </div>

        <div
          style={{
            width: 64,
            height: 4,
            borderRadius: 2,
            background: design.accentColor,
            opacity: translationOpacity,
          }}
        />

        <div
          style={{
            fontFamily: design.translationFontFamily,
            fontSize: translationFontSize,
            lineHeight: translationLineHeight,
            textAlign: "center",
            fontWeight: 600,
            opacity: translationOpacity,
            maxWidth: "92%",
          }}
        >
          {translationNode}
        </div>

        {design.showCountdownTimer && (
          <CountdownTimer
            design={design}
            currentFrame={verseStartFrame + frame}
            totalDurationInFrames={videoDurationInFrames}
          />
        )}

        {design.attribution && (
          <div
            style={{
              position: "absolute",
              bottom: `${4 * marginScale}%`,
              fontFamily: design.translationFontFamily,
              fontSize: metaFontSize,
              opacity: 0.7,
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
