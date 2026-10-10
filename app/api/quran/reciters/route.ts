import { NextResponse } from "next/server";
import { listReciters } from "@/lib/quran";

export async function GET() {
  try {
    const reciters = await listReciters();
    return NextResponse.json({ reciters });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
