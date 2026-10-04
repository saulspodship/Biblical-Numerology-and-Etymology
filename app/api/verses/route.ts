import { NextResponse } from "next/server";
import { verseSearchService } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? undefined;
  const systemId = params.get("systemId") ?? undefined;
  const rawValue = params.get("value");
  const value = rawValue === null ? undefined : Number(rawValue);
  if ((query?.length ?? 0) > 80 || (rawValue !== null && (!Number.isSafeInteger(value) || (value as number) < 0))) {
    return NextResponse.json({ error: "Invalid verse search parameters." }, { status: 400 });
  }
  if (!query?.trim() && !(systemId && Number.isInteger(value))) {
    return NextResponse.json({ error: "Search with a word or with both a system and value." }, { status: 400 });
  }
  try {
    const result = verseSearchService({ query, systemId, value, limit: 40 });
    if (result.status === "unknown-system") return NextResponse.json({ error: "Unknown numerology system." }, { status: 404 });
    return NextResponse.json({ verses: result.verses }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Verse search is temporarily unavailable." }, { status: 500 });
  }
}
