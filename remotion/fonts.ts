import { continueRender, delayRender, staticFile } from "remotion";
import { FONT_OPTIONS } from "../types/video";

const loaded = new Set<string>();

/**
 * Charge une police locale (fichier dans public/) avant que Remotion ne capture
 * la frame, pour éviter un rendu avec la police de repli (flash / mauvais rendu
 * de l'arabe lors de l'export serveur).
 */
export function ensureFontLoaded(family?: string, url?: string): void {
  if (!family || loaded.has(family)) return;
  const resolvedPath = url ?? FONT_OPTIONS.find((f) => f.family === family)?.file;
  if (!resolvedPath) return;

  loaded.add(family);
  const handle = delayRender(`Chargement de la police ${family}`);
  const path = resolvedPath.replace(/^\//, "");

  const fontFace = new FontFace(family, `url(${staticFile(path)})`);
  fontFace
    .load()
    .then((loadedFace) => {
      document.fonts.add(loadedFace);
      continueRender(handle);
    })
    .catch((err) => {
      console.error(`Impossible de charger la police "${family}" (${path})`, err);
      continueRender(handle);
    });
}
