# Gematria Lab — relational model and seed plan

## Runtime data flow

The UI is not seeded with per-screen mock JSON. Catalog screens load through same-origin API routes; route handlers are thin controllers, `lib/server/services.ts` applies application rules, `lib/server/repositories.ts` contains parameterized SQLite reads/writes, and `lib/server/db.ts` applies migrations and seeds the local relational catalog. The deterministic calculator is pure TypeScript in `lib/calculation.ts` and uses lookup tables mirrored into `numerology_system.letter_values_json`.

The preview/starter database is SQLite because it runs without external credentials. On Vercel, `VERCEL` selects a `/tmp` file and the schema/seed are recreated per serverless instance/cold start; this is a read-mostly demo mode, not durable storage. For production persistence or multiple instances, replace the SQLite repository with PostgreSQL (or Supabase) and keep the same table contract.

## Tables

| Table | Role and key relationships |
|---|---|
| `lexeme` | Central lexical record; language, text, transliteration, Strong's ID, optional self-root, part of speech, gloss. Indexed on text and transliteration. |
| `numerology_system` | Named/versioned lookup scheme, language, algorithm identifier, JSON values, description, and source reference. |
| `lexeme_value` | Precomputed deterministic value and digit root per lexeme/system pair; composite primary key. Indexed by `(system_id, value)`. |
| `lexeme_source` | Extra provenance junction for a lexeme's gloss, transliteration, or textual form. A gloss can carry its exact lexicon record. |
| `etymology_entry` | Ordered, source-required root/derivation/cognate/borrowed/folk-etymology steps; confidence constrained to the four required tags. |
| `source` | Citation metadata, type, URL/archive URL, year, author, reliability grade, and access notes. |
| `text_corpus` | Versioned source corpus or lexeme reference corpus, with language and license note. |
| `verse` | Corpus, reference, text, language; unique by corpus/book/chapter/verse. |
| `verse_word` | Ordered surface tokens mapped to lexemes; indexed on `lexeme_id`. |
| `verse_source` | Direct primary-text/translation/commentary citations attached to a specific verse. |
| `topic` | Curated research dossier and category. |
| `claim` | One claim per row, attributed to a maker, with confidence, status note, and kind. |
| `claim_source` | Many-to-many claim citations with `supports`, `disputes`, or `context` relation. Analyst retrieval drops any claim without a source row. |
| `entity` | Public people/organizations/places and narrowly documented biographies. |
| `connection` | Typed references between entities/lexemes/claims/topics; `basis` is constrained to `documented` or `numerological`, and the UI styles those bases separately. |
| `user_query` | Future optional server-sync table; local preview history is held in browser storage. `deleted_at` supports soft deletion. |
| `saved_note` | Future optional server-sync table; local preview notes are held in browser storage. `deleted_at` supports soft deletion. |
| `baseline_sample` | Exact same-value count and denominator per reference corpus/system/value, with method description. Missing values are materialized on first read. |
| `schema_migration` | Applied migration ledger. |

## Migrations

- `001_initial.sql` — tables, checks, foreign keys, migration ledger.
- `002_indexes.sql` — required lookup indexes and read-path indexes.
- `003_lexeme_source.sql` — provenance links for glosses and source-backed lexical content.
- `004_system_label_updates.sql` — explicit update to comparison-system labels.
- `005_verse_source.sql` — direct per-verse primary-text citations.

Migrations are tracked in `schema_migration`; they are versioned SQL files and are run before seeding.

## Seeded corpus (starter scope)

`lib/server/seed.ts` seeds nine systems: Hebrew standard, Gadol/final-letter, Siduri, Katan, Atbash, Greek isopsephy, English ordinal, English Pythagorean, and Arabic Abjad. The catalog contains a compact set of Hebrew, Greek, Arabic, Latin, and English lexemes with lexicon links where available. It includes five selected Hebrew verses, seven curated topics, source-linked claims, one debunked propaganda claim shown only in its historical context, several documented graph edges, and lexicon-derived baseline counts.

This seed is for product/QA demonstration, not a statistically representative linguistic corpus. The baseline UI shows both exact observed frequency in the compatible catalog and a reproducible Monte Carlo estimate: uniform draws with replacement from that catalog, matching the query's token count (capped at eight). It is a transparent model, not a universal probability, proof, or measure of semantic significance.

## Screen-to-data map

- Calculator: `numerology_system`; computed result from pure TS; same-value list from `lexeme_value`; baseline from `baseline_sample` plus a deterministic seeded simulation.
- Meaning/etymology: `lexeme`, `lexeme_source`, `etymology_entry`, `source`.
- Verse finder: `verse_word`, `verse`, `text_corpus`, and optional `lexeme_value` filter.
- Analyst/topics: `topic`, `claim`, `claim_source`, `source`, `entity`, `connection`.
- Graph: `connection` plus numerological same-value edges generated from the deterministic result and clearly separated from documented edges.
- Source library: `source` and reverse links to claims/lexemes.
- History and notes: browser-local storage in this first build; server tables are present for a future authenticated sync adapter.

## Key schema invariants

1. No numerical total is created by the AI path.
2. Every curated `claim` must have one or more `claim_source` rows (verified by an integration test).
3. A `DEBUNKED` entry describes a debunked assertion; it is not a label for the true corrective statement.
4. Etymology display uses only rows in `etymology_entry`; absence means “not in this seed corpus,” not “no etymology exists.”
5. A numerical graph edge is not treated as a documented edge and is always accompanied by a baseline.
