export const dynamic = "force-static";

export async function GET() {
  const content = `# Gematria Lab

A source-first educational research tool. Math is deterministic and computed from explicit lookup tables; AI is not used to calculate values.

## Public pages
- https://gematria-lab.saulspodship.com/ — interactive calculator and research workspace
- https://gematria-lab.saulspodship.com/topic/topic-antarctica — Antarctic Treaty topic and source-linked claims
- https://gematria-lab.saulspodship.com/topic/topic-epstein — public charging record, explicitly distinguished from allegation and speculation
- https://gematria-lab.saulspodship.com/topic/topic-propaganda-history — documented history and debunking of antisemitic propaganda
- https://gematria-lab.saulspodship.com/term/shalom — lexicon-linked Hebrew term record

## Evidence rules
- Every factual research claim should link a source and carry DOCUMENTED, CONTESTED, SPECULATIVE, or DEBUNKED status.
- Numerical equality is not evidence of historical, semantic, or causal connection. Review the displayed coincidence baseline.
- The etymology view distinguishes cited lexicon relations from unsupported wordplay.
- Antisemitic conspiracy material is included only as propaganda history and debunking, never as valid evidence.

Educational research tool, not proof; patterns do not establish causation.
`;
  return new Response(content, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
