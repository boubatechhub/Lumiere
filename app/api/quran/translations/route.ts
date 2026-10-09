import { NextResponse } from "next/server";
import { listFrenchTranslations } from "@/lib/quran";

export async function GET() {
  try {
    const translations = await listFrenchTranslations();
    return NextResponse.json({ translations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
