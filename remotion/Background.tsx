import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame } from "remotion";
import type { BackgroundConfig } from "../types/video";
import { resolveMediaSrc } from "./utils";

export const Background: React.FC<{
  background: BackgroundConfig;
  durationInFrames: number;
}> = ({ background, durationInFrames }) => {
  const frame = useCurrentFrame();

  if (background.type === "solid") {
    return <AbsoluteFill style={{ backgroundColor: background.colors[0] ?? "#000000" }} />;
  }

  if (background.type === "gradient") {
    const stops =
      background.colors.length > 1
        ? background.colors
        : [background.colors[0] ?? "#000000", "#000000"];
    return <AbsoluteFill style={{ background: `linear-gradient(135deg, ${stops.join(", ")})` }} />;
  }

  const scale = background.kenBurns
    ? interpolate(frame, [0, durationInFrames], [1, 1.12], { extrapolateRight: "clamp" })
    : 1;

  if (background.type === "image" && background.mediaUrl) {
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
        <Img
          src={resolveMediaSrc(background.mediaUrl)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
        />
      </AbsoluteFill>
    );
  }

  if (background.type === "video" && background.mediaUrl) {
    // Jouée une seule fois sur la durée du slide ; prévoir un clip au moins aussi long.
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
        <OffthreadVideo
          src={resolveMediaSrc(background.mediaUrl)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
        />
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill style={{ backgroundColor: "#000000" }} />;
};
