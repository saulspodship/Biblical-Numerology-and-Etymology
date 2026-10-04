import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/server/seed";

let db: Database.Database;

beforeAll(() => {
  db = new Database(":memory:");
  for (const migration of ["001_initial.sql", "002_indexes.sql", "003_lexeme_source.sql", "004_system_label_updates.sql", "005_verse_source.sql"]) {
    db.exec(fs.readFileSync(path.join(process.cwd(), "db", "migrations", migration), "utf8"));
  }
  db.transaction(() => seedDatabase(db))();
});

afterAll(() => db.close());

describe("relational seed catalog", () => {
  it("creates the configured systems and precomputes compatible lexeme values", () => {
    expect((db.prepare("SELECT COUNT(*) AS n FROM numerology_system").get() as { n: number }).n).toBe(9);
    expect((db.prepare("SELECT name FROM numerology_system WHERE id='latin-ordinal'").get() as { name: string }).name).toContain("English · ordinal");
    const shalom = db.prepare(`SELECT lv.value FROM lexeme l JOIN lexeme_value lv ON lv.lexeme_id=l.id
      WHERE l.text='שלום' AND lv.system_id='hebrew-standard'`).get() as { value: number };
    expect(shalom.value).toBe(376);
  });

  it("stores same-value corpus frequencies and links lexeme glosses to source rows", () => {
    const baseline = db.prepare(`SELECT match_count,total FROM baseline_sample WHERE corpus_id='reference-lexicon'
      AND system_id='hebrew-standard' AND value=13`).get() as { match_count: number; total: number };
    expect(baseline.match_count).toBeGreaterThanOrEqual(2);
    expect(baseline.total).toBeGreaterThan(baseline.match_count);
    const glossCitationCount = (db.prepare("SELECT COUNT(*) AS n FROM lexeme_source WHERE relation='gloss'").get() as { n: number }).n;
    expect(glossCitationCount).toBeGreaterThan(40);
  });

  it("links each seeded verse to a direct primary-text reference", () => {
    const counts = db.prepare(`SELECT COUNT(DISTINCT v.id) AS verses,COUNT(DISTINCT vs.verse_id) AS cited
      FROM verse v LEFT JOIN verse_source vs ON vs.verse_id=v.id`).get() as { verses: number; cited: number };
    expect(counts.verses).toBe(5);
    expect(counts.cited).toBe(counts.verses);
  });

  it("keeps every curated claim attached to at least one source", () => {
    const missing = db.prepare(`SELECT c.id FROM claim c LEFT JOIN claim_source cs ON cs.claim_id=c.id
      GROUP BY c.id HAVING COUNT(cs.source_id)=0`).all();
    expect(missing).toHaveLength(0);
  });

  it("indexes the required lookup paths", () => {
    const indexes = (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>).map((row) => row.name);
    expect(indexes).toContain("idx_lexeme_text");
    expect(indexes).toContain("idx_lexeme_value_system_value");
    expect(indexes).toContain("idx_verse_word_lexeme");
  });
});
