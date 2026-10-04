# Biblical Numerology & Etymology — Gematria Lab

**Understanding:** a web-first, source-first research workbench for deterministic Hebrew gematria and related numeral systems, lexicon-backed meaning/etymology, selected-verse search, and cited historical topic dossiers. The tool explicitly separates documented records from contested/debunked claims and speculative number matches.

## Assumptions and domain

- Product name assumed: **Gematria Lab**.
- Deployment host assumed: **`gematria-lab.saulspodship.com`**, under the `.com` root supplied in the brief—not `.com.in`.
- The exact `.com` spelling is also used in the prompt and appears in a current search result for the SaulsPodship project: https://github.com/Solatjamil/SaulsPodship. This implementation does **not** verify registrant ownership, authoritative DNS, certificate issuance, or availability of the desired subdomain. No DNS changes have been made.
- Web app first. Android packaging, signing, AdMob, and Play Store work are out of scope for this build.
- SQLite is used as a real relational starter database. On Vercel, `VERCEL` selects an ephemeral `/tmp` database that is seeded per function instance/cold start; that is suitable only for a read-mostly demo. Use PostgreSQL/Supabase for durable, multi-instance production data.

## Start locally

Requirements: Node 20.20+ (the checked environment is Node 20.20.2).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The first `/api` request creates `.data/research-lab.sqlite`, runs versioned SQL migrations, and seeds the catalog. `.data/` is ignored by Git. To reset the local sample database:

```bash
npm run db:reset
```

Run checks:

```bash
npm test
npx tsc --noEmit
npm run build
```

## Architecture

```text
Next.js App Router UI (SSR metadata + interactive client workspace)
    ↓ same-origin API routes / controllers
lib/server/services.ts (validation/orchestration)
    ↓ parameterized repository queries
lib/server/repositories.ts → lib/server/db.ts → SQLite

lib/calculation.ts is a pure deterministic TypeScript module.
```

- **Frontend:** Next.js 16 App Router + TypeScript + React; mobile-first custom interface, light/dark themes, RTL Hebrew, reduced-motion support, JSON-LD, robots, sitemap, and `llms.txt`.
- **Database:** SQLite + `better-sqlite3`. Local mode persists in `.data/`; Vercel mode writes to ephemeral `/tmp` and initializes its seeded catalog on a cold start. Five versioned migrations live in `db/migrations/`; curated records are seeded in `lib/server/seed.ts`. For durable Vercel production, use PostgreSQL/Supabase instead of ephemeral SQLite.
- **Math:** pure TypeScript lookup-table engine, independent of AI. It strips Hebrew niqqud, preserves final-form distinctions where the selected system calls for them, and emits per-letter breakdowns.
- **API:** same-origin Next route handlers call services and repositories. Queries are parameterized; error responses do not return stack traces. The AI route applies an in-memory rate limit and a same-origin check.
- **AI:** without `ANTHROPIC_API_KEY`, the analyst is a deterministic retrieval-only brief. If both `ANTHROPIC_API_KEY` and a supported `ANTHROPIC_MODEL` are configured, a server-only Anthropic adapter sends the question plus source-linked retrieved claims; there is no client-side key. Without both values, the route stays in retrieval-only mode. Run the safety evaluation set before enabling production calls.
- **Personal data:** history and saved notes use browser local storage in this build. The schema contains soft-deletable `user_query` and `saved_note` tables for a later authenticated/sync adapter; they are not currently written by this local-first UI.
- **Security headers:** same-origin policy by default, HSTS, CSP in production, frame/content-type/referrer/permissions headers. The CSP currently allows inline scripts/styles for Next hydration; a production operator should move to a nonce-based policy and test it with the final hosting adapter.

Detailed table definitions, screen mapping, and seed limitations: [`docs/data-model.md`](docs/data-model.md).
Deployment and rollback notes: [`docs/deployment.md`](docs/deployment.md).

## Data model / seed plan

Central entity: `lexeme`. Related tables include `numerology_system`, `lexeme_value`, `lexeme_source`, `etymology_entry`, `source`, `text_corpus`, `verse`, `verse_word`, `verse_source`, `topic`, `claim`, `claim_source`, `entity`, `connection`, `user_query`, `saved_note`, and `baseline_sample`.

The seed includes nine named systems; a compact lexeme catalog across Hebrew, Greek, Arabic, Latin, and English; five selected Hebrew verses; seven topic dossiers; source-linked claims; lexicon-linked glosses; and same-value baseline counts. This is a build seed, **not** a representative corpus. Every curated claim has at least one `claim_source` row; the integration test enforces it.

## Coincidence baseline

For a query, the calculator displays:

1. The exact number of entries in the compatible seed lexicon with the same total, divided by the compatible entry count.
2. A reproducible 10,000-draw simulation using uniform-with-replacement draws from that lexicon's precomputed values, matching the query's token count (1–8).

The UI describes the sample model and its limits. These are exploratory baselines over a small curated seed set—not universal probabilities, evidence of meaning, or causal tests.

## Non-negotiable research boundaries

- Math is deterministic; AI cannot calculate values.
- Claims in the curated analyst require a citation and one of `DOCUMENTED`, `CONTESTED`, `SPECULATIVE`, `DEBUNKED`.
- The Epstein seed records only a public charging announcement and clearly treats charges as allegations, not guilt.
- Antisemitic propaganda appears only as documented history and debunking; no group is targeted or blamed.
- Lexicon/etymology absence is labeled as missing from the seed, not proof that a scholarly relation does not exist.
- Footer and analyst disclaimer: “Educational research tool, not proof; patterns do not establish causation.”

## Code map

- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — home, shared metadata and visual system.
- `components/LabApp.tsx` — interactive workspace and browser-local user state.
- `components/ResultCard.tsx`, `SourceChip.tsx`, `ConfidenceBadge.tsx`, `Icon.tsx` — shared UI components.
- `lib/calculation.ts` — pure numerical engine and arithmetic helpers.
- `lib/server/db.ts`, `seed.ts`, `services.ts`, `repositories.ts`, `rate-limit.ts` — persistence and service layer.
- `app/api/*` — bootstrap/search/baseline/etymology/verse/topic/analyst endpoints.
- `app/topic/[slug]`, `app/term/[slug]` — server-rendered SEO pages with JSON-LD and FAQs.
- `tests/calculation.test.ts`, `tests/analyst-retrieval.test.ts`, `tests/database.test.ts` — calculation, retrieval, and relational integration tests.

## QA summary

Verified in the workspace:

- 21 automated tests pass (deterministic calculations, final forms, niqqud, Greek/Arabic values, digit roots, factors, sequence checks, seeded relational records, citation coverage, and required indexes).
- `npx tsc --noEmit` and `npm run build` pass.
- `npm audit` reports zero vulnerabilities after upgrading Vitest to a patched release.
- Manual HTTP smoke checks returned 200 for `/`, `/api/bootstrap`, `/api/baseline`, `/api/etymology`, `/api/verses`, and `/api/analyst` using the retrieval-only mode.
- Sample checks include Hebrew `שלום` = 376, Hebrew `אהבה` = 13, and a baseline over the seeded lexicon.

Not verified / not included yet: browser-based visual QA across responsive, dark-mode, RTL, reduced-motion, and print/PDF states; Playwright E2E and accessibility audit; real Anthropic call or AI red-team evaluation (no secret configured); OAuth/JWT/authenticated account sync; distributed rate limiting; PostgreSQL migration; encrypted backup automation/monitoring; a full Bible corpus/offline bundle; AdSense/AdMob; Android build/signing; DNS, TLS, and live deployment. Before production, complete those items, review privacy wording for the actual host/provider, and manually verify every curated citation and corpus/license.
