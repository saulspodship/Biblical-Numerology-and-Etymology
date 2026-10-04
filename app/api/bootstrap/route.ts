import { NextResponse } from "next/server";
import { catalogService } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(catalogService(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Catalog data is temporarily unavailable." }, { status: 500 });
  }
}
