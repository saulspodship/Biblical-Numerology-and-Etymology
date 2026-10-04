import { NextResponse } from "next/server";
import { analystRetrievalService } from "@/lib/server/services";
import { allowRequest, getClientKey } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are the Research Analyst for Gematria Lab, an educational research tool. You explain and cross-reference only the supplied retrieval context. You are not a lawyer, investigator, or authority. Follow every rule below:
1. Math is never AI-generated. Never compute gematria, numerology, probabilities, or values. All values must come from the deterministic calculator and lookup tables; you may explain a supplied calculation only.
2. Every factual claim must cite a source included in the supplied context and use only that claim's supplied confidence tag: DOCUMENTED, CONTESTED, SPECULATIVE, or DEBUNKED. Do not invent, guess, or alter sources, URLs, quotations, or confidence tags. If the context has no source, say you cannot verify it.
3. Make no unsourced accusations about real, living people or families. Name people only for documented, cited facts. Treat allegations as allegations, never as conclusions or guilt by association.
4. If a coincidence baseline is explicitly supplied in the retrieval context, mention it whenever discussing a numerical match. If no baseline is supplied, say so and direct the user to the deterministic calculator; never invent or estimate one. Explain that patterns are easy to find after many searches, and that a match is not evidence of causation.
5. Distinguish scholarly etymology from folk/popular etymology. If no lexicon record is supplied, say that the root claim is unsupported in this dataset.
6. Do not produce hate content, group-targeted claims, harassment, or calls for violence. Antisemitic conspiracy material may be described only as propaganda history and must be clearly debunked, never presented as valid.
7. Include this disclaimer in the answer: “Educational research tool, not proof; patterns do not establish causation.”
Structure the answer as: documented; claims by others / contested or debunked; unsupported or not established; optional numerological observations (clearly labelled). Use concise prose and cite only the supplied source titles/URLs. If the evidence is insufficient, do not fill gaps with speculation.`;

function listByTag(claims: any[], tags: string[]) {
  return claims.filter((claim) => tags.includes(claim.confidence));
}

function sourceList(claims: any[]) {
  const unique = new Map<string, any>();
  for (const claim of claims) {
    for (const link of claim.sources) unique.set(link.source.id, link.source);
  }
  return [...unique.values()];
}

function fallbackSummary(question: string, claims: any[]) {
  if (!claims.length) {
    return `I could not find a sourced claim in the curated catalog that directly addresses “${question}.” I will not infer a hidden connection or make an accusation without evidence. Try a narrower query or open a topic with primary sources. No calculation was performed. Educational research tool, not proof; patterns do not establish causation.`;
  }
  const documented = listByTag(claims, ["DOCUMENTED"]);
  const disputed = listByTag(claims, ["CONTESTED", "SPECULATIVE", "DEBUNKED"]);
  const lines = ["DOCUMENTED", ...documented.map((claim) => `• ${claim.statement} [${claim.confidence}; ${claim.sources.map((item: any) => item.source.title).join("; ")}]`), "CLAIMS BY OTHERS / CONTESTED OR DEBUNKED", ...(disputed.length ? disputed.map((claim) => `• ${claim.statement} [${claim.confidence}; ${claim.sources.map((item: any) => item.source.title).join("; ")}]`) : ["• No contested or speculative claim was retrieved from this curated topic set."]), "UNSUPPORTED OR NOT ESTABLISHED", "• The retrieved sources do not establish additional claims beyond the cited records. A numerical match, if any, does not establish a historical or causal relationship.", "NUMEROLOGICAL OBSERVATIONS", "• No value was calculated in the analyst. Use the deterministic calculator and its coincidence baseline for any number pattern.", "Educational research tool, not proof; patterns do not establish causation."];
  return lines.join("\n");
}

async function askAnthropic(question: string, evidence: unknown): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Research question:\n${question}\n\nRetrieved claims and sources (the only allowed factual context):\n${JSON.stringify(evidence)}` }],
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
    return text?.slice(0, 8_000) || null;
  } catch {
    return null;
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!requestHost) return false;
  try { return new URL(origin).host.toLowerCase() === requestHost.split(",")[0].trim().toLowerCase(); }
  catch { return false; }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin analyst requests are not allowed." }, { status: 403 });
  const key = getClientKey(request);
  if (!allowRequest(`analyst:${key}`, 8, 60_000)) {
    return NextResponse.json({ error: "Research Analyst rate limit reached. Please wait a minute before trying again." }, { status: 429 });
  }
  let body: { question?: unknown; topicId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request must be valid JSON." }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "") : "";
  const topicId = typeof body.topicId === "string" ? body.topicId.slice(0, 80) : undefined;
  if (!question || question.length > 800) {
    return NextResponse.json({ error: "Enter a question from 1 to 800 characters." }, { status: 400 });
  }
  try {
    const evidence = analystRetrievalService(question, topicId);
    const claims = evidence.claims.filter((claim: any) => claim.sources?.length > 0);
    const aiSummary = await askAnthropic(question, claims);
    const answer = aiSummary ?? fallbackSummary(question, claims);
    return NextResponse.json({
      mode: aiSummary ? "ai-summary" : "curated-retrieval",
      answer,
      documented: listByTag(claims, ["DOCUMENTED"]),
      contestedOrClaimed: listByTag(claims, ["CONTESTED", "SPECULATIVE", "DEBUNKED"]),
      unsupportedNote: claims.length
        ? "No additional assertion is established by the retrieved sources."
        : "No directly relevant sourced claim was found in the curated dataset.",
      numerologicalNote: "The analyst did not calculate any values. If you explore a numerical match, pair it with the deterministic calculator's baseline; a match is not causation.",
      topics: evidence.topics.map((topic: any) => ({ id: topic.id, title: topic.title, category: topic.category })),
      sources: sourceList(claims),
      disclaimer: "Educational research tool, not proof; patterns do not establish causation.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The Research Analyst is temporarily unavailable." }, { status: 500 });
  }
}
