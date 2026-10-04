import { NextResponse } from "next/server";
import { baselineService } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const systemId = params.get("systemId") ?? "";
  const value = Number(params.get("value"));
  const wordCount = Number(params.get("wordCount") ?? "1");
  if (!systemId || !Number.isSafeInteger(value) || value < 0 || value > 10_000_000 || !Number.isInteger(wordCount) || wordCount < 1 || wordCount > 8) {
    return NextResponse.json({ error: "Provide a valid system, non-negative value, and 1–8 word count." }, { status: 400 });
  }
  try {
    const result = baselineService(systemId, value, wordCount);
    if (result.status === "unknown-system") return NextResponse.json({ error: "Unknown numerology system." }, { status: 404 });
    if (result.status === "empty") return NextResponse.json({ error: "No compatible reference lexemes are available for this system." }, { status: 404 });
    return NextResponse.json(result.result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Baseline data is temporarily unavailable." }, { status: 500 });
  }
}
