import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { DesignConfig, Verse } from "../types/video";
import { Background } from "./Background";
import { ensureFontLoaded } from "./fonts";
import { resolveMediaSrc } from "./utils";

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
}> = ({ verse, design, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  ensureFontLoaded(design.mainFontFamily, design.mainFontUrl);
  ensureFontLoaded(design.translationFontFamily, design.translationFontUrl);

  const isPortrait = height >= width;
  const mainFontSize = isPortrait ? width * 0.09 : height * 0.14;
  const translationFontSize = mainFontSize * 0.42;
  const metaFontSize = mainFontSize * 0.22;

  const hasLogo = Boolean(design.logoUrl);
  // Logo aligné sur la même ligne que les textes d'en-tête (pageName / référence).
  const headerLogoHeight = metaFontSize * 6.4;
  const hasHeaderText = design.showReference && Boolean(design.pageName || verse.reference);
  const showHeaderRow = hasLogo || hasHeaderText;
  const contentTopPadding = isPortrait ? "14%" : "13%";

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

  return (
    <AbsoluteFill>
      <Background background={design.background} durationInFrames={durationInFrames} />

      {/* pauseWhenBuffering : évite que l'aperçu en direct se désynchronise en
          changeant de verset avant que son clip audio distant ait fini de
          charger — il met en pause le temps que l'audio soit prêt plutôt que
          de dériver. Sans effet sur le rendu final (déjà frame-exact). */}
      {verse.audioUrl && <Audio src={resolveMediaSrc(verse.audioUrl)} pauseWhenBuffering />}

      {showHeaderRow && (
        <div
          style={{
            position: "absolute",
            top: "7%",
            left: "6%",
            right: "6%",
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
          gap: isPortrait ? 32 : 24,
          paddingTop: contentTopPadding,
          paddingBottom: isPortrait ? "8%" : "6%",
          paddingLeft: isPortrait ? "6%" : "12%",
          paddingRight: isPortrait ? "6%" : "12%",
          color: design.textColor,
        }}
      >
        <div
          dir={design.mainRTL ? "rtl" : "ltr"}
          style={{
            fontFamily: design.mainFontFamily,
            fontSize: mainFontSize,
            lineHeight: 1.4,
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
            lineHeight: 1.5,
            textAlign: "center",
            fontWeight: 600,
            opacity: translationOpacity,
            maxWidth: "92%",
          }}
        >
          {translationNode}
        </div>

        {design.attribution && (
          <div
            style={{
              position: "absolute",
              bottom: "4%",
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
