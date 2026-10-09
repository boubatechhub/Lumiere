import { staticFile } from "remotion";

/** Résout une URL de média (uploadée ou distante) en chemin utilisable par Remotion. */
export function resolveMediaSrc(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return staticFile(url.replace(/^\//, ""));
}
