import { interpolate, staticFile } from "remotion";

/** Résout une URL de média (uploadée ou distante) en chemin utilisable par Remotion. */
export function resolveMediaSrc(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return staticFile(url.replace(/^\//, ""));
}

/**
 * Volume avec fondu en entrée/sortie. `fadeFrames` (par défaut ~1s, capée à la
 * moitié de la durée) permet de faire correspondre le fondu audio à la durée
 * d'une transition visuelle précise — essentiel pour les pistes qui se
 * chevauchent pendant un crossfade (`TransitionSeries.Transition` superpose
 * la fin d'une séquence et le début de la suivante), sous peine d'entendre
 * deux pistes à pleine puissance en même temps.
 */
export function fadedVolume(
  base: number,
  frame: number,
  durationInFrames: number,
  fps: number,
  fadeFrames?: number,
): number {
  const frames = Math.max(1, Math.min(fadeFrames ?? fps, Math.floor(durationInFrames / 2)));
  const fadeIn = interpolate(frame, [0, frames], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - frames, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return base * Math.min(fadeIn, fadeOut);
}
