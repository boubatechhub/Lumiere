import { NextResponse } from "next/server";
import { listQuranChapters } from "@/lib/quran";

export async function GET() {
  try {
    const chapters = await listQuranChapters();
    return NextResponse.json({ chapters });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
