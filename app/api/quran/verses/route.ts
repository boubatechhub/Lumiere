import { NextRequest, NextResponse } from "next/server";
import { fetchQuranVerses } from "@/lib/quran";

const MAX_VERSES_PER_IMPORT = 50;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chapterId = Number(params.get("chapter"));
  const fromVerse = Number(params.get("from"));
  const toVerse = Number(params.get("to"));
  const translationId = Number(params.get("translation"));

  if (!chapterId || !fromVerse || !toVerse || !translationId) {
    return NextResponse.json(
      { error: "Paramètres manquants : chapter, from, to, translation sont requis." },
      { status: 400 },
    );
  }

  if (toVerse < fromVerse) {
    return NextResponse.json({ error: "Le verset de fin doit être après le verset de début." }, { status: 400 });
  }

  if (toVerse - fromVerse + 1 > MAX_VERSES_PER_IMPORT) {
    return NextResponse.json(
      { error: `Trop de versets d'un coup (max ${MAX_VERSES_PER_IMPORT}). Importe par plus petits groupes.` },
      { status: 400 },
    );
  }

  try {
    const verses = await fetchQuranVerses({ chapterId, fromVerse, toVerse, translationId });
    return NextResponse.json({ verses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
