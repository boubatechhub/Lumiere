import { NextRequest, NextResponse } from "next/server";
import { deriveImageQuery, searchBackgroundImage, trackDownload } from "@/lib/images";

const VALID_ORIENTATIONS = new Set(["portrait", "landscape", "squarish"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const text = params.get("text")?.trim();
  const orientationParam = params.get("orientation") ?? "portrait";
  const orientation = VALID_ORIENTATIONS.has(orientationParam)
    ? (orientationParam as "portrait" | "landscape" | "squarish")
    : "portrait";

  if (!text) {
    return NextResponse.json({ error: "Paramètre 'text' requis." }, { status: 400 });
  }

  const query = deriveImageQuery(text, text.slice(0, 40));

  try {
    const result = await searchBackgroundImage(query, orientation);
    if (result?.downloadLocation) {
      trackDownload(result.downloadLocation);
    }
    return NextResponse.json({ url: result?.url ?? null, query });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
