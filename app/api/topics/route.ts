import { NextResponse } from "next/server";
import { topicLibraryService } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ topics: topicLibraryService() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Topic data is temporarily unavailable." }, { status: 500 });
  }
}
