import { NextResponse } from "next/server";
import { etymologyService } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 80) return NextResponse.json({ error: "Term is limited to 80 characters." }, { status: 400 });
  try {
    return NextResponse.json(etymologyService(query), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Etymology data is temporarily unavailable." }, { status: 500 });
  }
}
