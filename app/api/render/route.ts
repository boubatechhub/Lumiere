import { mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const verseSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  translation: z.string().min(1),
  reference: z.string().optional(),
  durationSec: z.number().positive().optional(),
});

const designSchema = z.object({
  format: z.enum(["9:16", "1:1", "16:9"]),
  background: z.object({
    type: z.enum(["solid", "gradient", "image", "video"]),
    colors: z.array(z.string()),
    mediaUrl: z.string().optional(),
    kenBurns: z.boolean().optional(),
  }),
  textColor: z.string(),
  accentColor: z.string(),
  logoUrl: z.string().optional(),
  mainFontFamily: z.string(),
  mainFontUrl: z.string().optional(),
  translationFontFamily: z.string(),
  translationFontUrl: z.string().optional(),
  mainRTL: z.boolean(),
  textEntry: z.enum(["fade", "slideUp", "typewriter", "wordByWord"]),
  transition: z.enum(["fade", "slideLeft", "wipe", "zoom"]),
  transitionDurationMs: z.number().min(0),
  showReference: z.boolean(),
  attribution: z.string().optional(),
  pageName: z.string().optional(),
  audio: z.object({
    musicUrl: z.string().optional(),
    ambienceUrl: z.string().optional(),
    musicVolume: z.number().min(0).max(1),
    ambienceVolume: z.number().min(0).max(1),
  }),
  secondsPerVerse: z.union([z.number().positive(), z.literal("auto")]),
});

const requestSchema = z.object({
  verses: z.array(verseSchema).min(1),
  design: designSchema,
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Configuration de vidéo invalide.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { verses, design } = parsed.data;

  try {
    // Rebundle à chaque génération : le dossier public/ (polices, musiques,
    // images uploadées) est copié dans le bundle au moment du build, donc on
    // doit regénérer pour que les médias uploadés après coup soient inclus.
    const serveUrl = await bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    });

    // Port explicite : ce code tourne dans le process du serveur Next.js
    // (déjà sur le port 3000 / process.env.PORT), donc le serveur statique
    // interne de Remotion doit utiliser un port différent.
    const remotionServerPort = 3900;

    const composition = await selectComposition({
      serveUrl,
      id: "VerseVideo",
      inputProps: { verses, design },
      port: remotionServerPort,
    });

    const outputDir = path.join(process.cwd(), "public", "renders");
    await mkdir(outputDir, { recursive: true });
    const outputName = `${crypto.randomUUID()}.mp4`;
    const outputLocation = path.join(outputDir, outputName);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps: { verses, design },
      port: remotionServerPort,
    });

    return NextResponse.json({ url: `/renders/${outputName}` });
  } catch (err) {
    console.error("Erreur lors du rendu Remotion", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: `Le rendu a échoué : ${message}` }, { status: 500 });
  }
}
