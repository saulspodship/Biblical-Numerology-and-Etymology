import "server-only";
import type Database from "better-sqlite3";
import { getDatabase } from "@/lib/server/db";
import { selectAnalystClaims, selectAnalystTopics } from "@/lib/analyst-retrieval";
import type {
  BaselineRecord, BootstrapData, Claim, EtymologyEntry, Lexeme, LexemeSourceLink, NumerologySystem,
  ResearchConnection, Source, Topic, VerseRecord,
} from "@/lib/types";

function rows<T>(statement: any, ...args: any[]): T[] {
  return statement.all(...args) as T[];
}

function getSourceMap(db: Database.Database): Map<string, Source> {
  const all = rows<Source>(db.prepare("SELECT * FROM source ORDER BY title"));
  return new Map(all.map((source) => [source.id, source]));
}

function getClaimsForTopic(db: Database.Database, topicId: string, sourceMap?: Map<string, Source>): Claim[] {
  const sources = sourceMap ?? getSourceMap(db);
  const claimRows = rows<Claim>(db.prepare("SELECT * FROM claim WHERE topic_id=? ORDER BY confidence, id"), topicId);
  const claimSourceQuery = db.prepare(`SELECT cs.supports,cs.note,s.* FROM claim_source cs
    JOIN source s ON s.id=cs.source_id WHERE cs.claim_id=? ORDER BY s.title`);
  return claimRows.map((claim) => {
    const linked = rows<(Source & { supports: string; note: string | null })>(claimSourceQuery, claim.id);
    return {
      ...claim,
      sources: linked.map(({ supports, note, ...source }) => ({ source: sources.get(source.id) ?? source, supports, note })),
    };
  });
}

function labelReference(db: Database.Database, type: string, id: string): string {
  if (type === "lexeme") {
    const row = db.prepare("SELECT text,transliteration FROM lexeme WHERE id=?").get(Number(id)) as { text: string; transliteration: string | null } | undefined;
    return row ? `${row.text}${row.transliteration ? ` · ${row.transliteration}` : ""}` : "Unknown lexeme";
  }
  if (type === "entity") {
    return (db.prepare("SELECT name FROM entity WHERE id=?").get(id) as { name: string } | undefined)?.name ?? "Unknown entity";
  }
  if (type === "topic") {
    return (db.prepare("SELECT title FROM topic WHERE id=?").get(id) as { title: string } | undefined)?.title ?? "Unknown topic";
  }
  if (type === "claim") {
    return (db.prepare("SELECT statement FROM claim WHERE id=?").get(id) as { statement: string } | undefined)?.statement ?? "Unknown claim";
  }
  return "Unknown reference";
}

export function getBootstrapData(): BootstrapData {
  const db = getDatabase();
  const systems = rows<Omit<NumerologySystem, "letterValues">>(db.prepare("SELECT * FROM numerology_system WHERE enabled=1 ORDER BY sort_order"))
    .map((system) => ({ ...system, letterValues: JSON.parse(system.letter_values_json) as Record<string, number> }));
  const lexemes = rows<Lexeme>(db.prepare("SELECT * FROM lexeme ORDER BY language,transliteration,text"));
  const lexemeValues = rows(db.prepare("SELECT lexeme_id,system_id,value,reduced_value FROM lexeme_value")) as BootstrapData["lexemeValues"];
  const sources = rows<Source>(db.prepare("SELECT * FROM source ORDER BY title"));
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const lexemeSources = rows<any>(db.prepare(`SELECT ls.lexeme_id,ls.relation,ls.confidence,ls.note,s.*
    FROM lexeme_source ls JOIN source s ON s.id=ls.source_id ORDER BY ls.lexeme_id,s.title`))
    .map((row) => {
      const { lexeme_id, relation, confidence, note, ...source } = row;
      return { lexeme_id, relation, confidence, note, source: source as Source } satisfies LexemeSourceLink;
    });
  const topicRows = rows<Omit<Topic, "claims">>(db.prepare("SELECT * FROM topic ORDER BY category,title"));
  const topics = topicRows.map((topic) => ({ ...topic, claims: getClaimsForTopic(db, topic.id, sourceMap) }));

  const etymologyRows = rows<any>(db.prepare(`SELECT ee.*, l.text AS lexeme_text,l.language AS lexeme_language,
    l.transliteration AS lexeme_transliteration,l.strongs_id AS lexeme_strongs_id,l.root_id AS lexeme_root_id,
    l.part_of_speech AS lexeme_part_of_speech,l.gloss AS lexeme_gloss,
    f.text AS from_text,f.language AS from_language,f.transliteration AS from_transliteration,
    f.strongs_id AS from_strongs_id,f.root_id AS from_root_id,f.part_of_speech AS from_part_of_speech,f.gloss AS from_gloss,
    s.id AS source_id,s.type AS source_type,s.title AS source_title,s.author AS source_author,s.year AS source_year,
    s.url AS source_url,s.archive_url AS source_archive_url,s.reliability_grade AS source_reliability_grade,s.access_note AS source_access_note
    FROM etymology_entry ee JOIN lexeme l ON l.id=ee.lexeme_id
    LEFT JOIN lexeme f ON f.id=ee.from_lexeme_id JOIN source s ON s.id=ee.source_id
    ORDER BY ee.lexeme_id,ee.step_order`));
  const etymology: EtymologyEntry[] = etymologyRows.map((row) => ({
    id: row.id, lexeme_id: row.lexeme_id, step_order: row.step_order, from_lexeme_id: row.from_lexeme_id,
    relation: row.relation, explanation: row.explanation, confidence: row.confidence,
    lexeme: { id: row.lexeme_id, text: row.lexeme_text, language: row.lexeme_language, transliteration: row.lexeme_transliteration,
      strongs_id: row.lexeme_strongs_id, root_id: row.lexeme_root_id, part_of_speech: row.lexeme_part_of_speech, gloss: row.lexeme_gloss },
    fromLexeme: row.from_text ? { id: row.from_lexeme_id, text: row.from_text, language: row.from_language, transliteration: row.from_transliteration,
      strongs_id: row.from_strongs_id, root_id: row.from_root_id, part_of_speech: row.from_part_of_speech, gloss: row.from_gloss } : null,
    source: { id: row.source_id, type: row.source_type, title: row.source_title, author: row.source_author, year: row.source_year,
      url: row.source_url, archive_url: row.source_archive_url, reliability_grade: row.source_reliability_grade, access_note: row.source_access_note },
  }));

  const verseRows = rows<any>(db.prepare(`SELECT v.*, vs.source_id FROM verse v
    LEFT JOIN verse_source vs ON vs.verse_id=v.id AND vs.relation='primary_text'
    ORDER BY v.book,v.chapter,v.verse_no`));
  const verses: VerseRecord[] = verseRows.map((verse) => ({
    id: verse.id, corpus_id: verse.corpus_id, book: verse.book, chapter: verse.chapter, verse_no: verse.verse_no,
    text: verse.text, language: verse.language, source: verse.source_id ? sourceMap.get(verse.source_id) ?? null : null,
  }));

  const connectionRows = rows<any>(db.prepare("SELECT * FROM connection ORDER BY basis,id"));
  const connections: ResearchConnection[] = connectionRows.map((connection) => ({
    ...connection,
    source: connection.source_id ? sourceMap.get(connection.source_id) ?? null : null,
    fromLabel: labelReference(db, connection.from_ref_type, connection.from_ref_id),
    toLabel: labelReference(db, connection.to_ref_type, connection.to_ref_id),
  }));

  return { systems, lexemes, lexemeValues, lexemeSources, sources, topics, etymology, verses, connections };
}

export function getTopicBySlug(slug: string) {
  const db = getDatabase();
  const topic = db.prepare("SELECT * FROM topic WHERE id=? OR lower(replace(title,' ','-'))=?").get(slug, slug.toLowerCase()) as Omit<Topic, "claims"> | undefined;
  if (!topic) return null;
  return { ...topic, claims: getClaimsForTopic(db, topic.id) };
}

export function getLexemeBySlug(slug: string) {
  const db = getDatabase();
  const lexeme = db.prepare(`SELECT * FROM lexeme WHERE lower(transliteration)=? OR lower(text)=?
    ORDER BY CASE WHEN lower(transliteration)=? THEN 0 ELSE 1 END LIMIT 1`).get(slug.toLowerCase(), slug.toLowerCase(), slug.toLowerCase()) as Lexeme | undefined;
  if (!lexeme) return null;
  const values = rows<any>(db.prepare(`SELECT lv.system_id,lv.value,lv.reduced_value,ns.name AS system_name,ns.description,ns.source_ref,
    s.id AS method_source_id,s.type AS method_source_type,s.title AS method_source_title,s.author AS method_source_author,
    s.year AS method_source_year,s.url AS method_source_url,s.archive_url AS method_source_archive_url,
    s.reliability_grade AS method_source_reliability_grade,s.access_note AS method_source_access_note
    FROM lexeme_value lv JOIN numerology_system ns ON ns.id=lv.system_id LEFT JOIN source s ON s.id=ns.source_ref
    WHERE lv.lexeme_id=? ORDER BY ns.sort_order`), lexeme.id);
  const root = lexeme.root_id ? db.prepare("SELECT * FROM lexeme WHERE id=?").get(lexeme.root_id) as Lexeme | undefined : null;
  const etymology = rows<any>(db.prepare(`SELECT ee.*,s.title AS source_title,s.url AS source_url,s.archive_url,s.author,s.year
    FROM etymology_entry ee JOIN source s ON s.id=ee.source_id WHERE ee.lexeme_id=? ORDER BY ee.step_order`), lexeme.id);
  const sourceIds = [...new Set(etymology.map((entry) => entry.source_id))];
  const sourceMap = getSourceMap(db);
  const lexemeSources = rows<any>(db.prepare(`SELECT ls.relation,ls.confidence,ls.note,s.* FROM lexeme_source ls
    JOIN source s ON s.id=ls.source_id WHERE ls.lexeme_id=? ORDER BY s.title`), lexeme.id)
    .map((row) => {
      const { relation, confidence, note, ...source } = row;
      return { relation, confidence, note, source: source as Source };
    });
  return { lexeme, values, root, etymology, lexemeSources, sourceMap: sourceIds.map((id) => sourceMap.get(id)).filter(Boolean) };
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

export function searchLexemes(query: string) {
  const db = getDatabase();
  const q = query.trim();
  if (!q || q.length > 80) return [];
  const exact = rows<Lexeme>(db.prepare(`SELECT * FROM lexeme WHERE lower(text)=lower(?) OR lower(transliteration)=lower(?)
    ORDER BY language,transliteration LIMIT 20`), q, q);
  if (exact.length) return exact.map((lexeme) => ({ ...lexeme, match: "exact" }));
  const partial = rows<Lexeme>(db.prepare(`SELECT * FROM lexeme WHERE lower(text) LIKE lower(?) OR lower(transliteration) LIKE lower(?)
    ORDER BY language,transliteration LIMIT 20`), `%${q}%`, `%${q}%`);
  if (partial.length) return partial.map((lexeme) => ({ ...lexeme, match: "partial" }));
  const candidates = rows<Lexeme>(db.prepare("SELECT * FROM lexeme WHERE transliteration IS NOT NULL"));
  return candidates.map((lexeme) => ({ lexeme, distance: editDistance(q.toLowerCase(), (lexeme.transliteration ?? "").toLowerCase()) }))
    .filter(({ distance }) => distance <= Math.max(1, Math.floor(q.length / 3)))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(({ lexeme }) => ({ ...lexeme, match: "nearest transliteration" }));
}

export function getEtymologyForQuery(query: string) {
  const db = getDatabase();
  const lexeme = db.prepare(`SELECT * FROM lexeme WHERE lower(text)=lower(?) OR lower(transliteration)=lower(?)
    ORDER BY CASE WHEN lower(text)=lower(?) THEN 0 ELSE 1 END LIMIT 1`).get(query.trim(), query.trim(), query.trim()) as Lexeme | undefined;
  if (!lexeme) return { lexeme: null, entries: [] };
  const bootstrap = getBootstrapData();
  return { lexeme, entries: bootstrap.etymology.filter((entry) => entry.lexeme_id === lexeme.id) };
}

export function getVerses(params: { query?: string; systemId?: string; value?: number; limit?: number }) {
  const db = getDatabase();
  const conditions: string[] = [];
  const bind: Array<string | number> = [];
  if (params.systemId && Number.isInteger(params.value)) {
    conditions.push(`EXISTS (SELECT 1 FROM verse_word vw JOIN lexeme_value lv ON lv.lexeme_id=vw.lexeme_id
      WHERE vw.verse_id=v.id AND lv.system_id=? AND lv.value=?)`);
    bind.push(params.systemId, Number(params.value));
  }
  if (params.query?.trim()) {
    const q = params.query.trim();
    conditions.push(`(lower(v.text) LIKE lower(?) OR EXISTS (SELECT 1 FROM verse_word vw JOIN lexeme l ON l.id=vw.lexeme_id
      WHERE vw.verse_id=v.id AND (lower(l.text)=lower(?) OR lower(l.transliteration)=lower(?) OR lower(vw.surface_form) LIKE lower(?))))`);
    bind.push(`%${q}%`, q, q, `%${q}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
  const verses = rows<VerseRecord & { source_id: string | null }>(db.prepare(`SELECT DISTINCT v.*,vs.source_id FROM verse v
    LEFT JOIN verse_source vs ON vs.verse_id=v.id AND vs.relation='primary_text'
    ${where} ORDER BY v.book,v.chapter,v.verse_no LIMIT ?`), ...bind, limit);
  const sourceMap = getSourceMap(db);
  const tokenQuery = db.prepare(`SELECT vw.position,vw.surface_form,l.*,lv.system_id,lv.value,lv.reduced_value
    FROM verse_word vw JOIN lexeme l ON l.id=vw.lexeme_id LEFT JOIN lexeme_value lv ON lv.lexeme_id=l.id
    WHERE vw.verse_id=? ORDER BY vw.position`);
  return verses.map(({ source_id, ...verse }) => {
    const tokenRows = rows<any>(tokenQuery, verse.id);
    const byPosition = new Map<number, { position: number; surface_form: string; lexeme: Lexeme; values: Array<{ lexeme_id: number; system_id: string; value: number; reduced_value: number }> }>();
    for (const row of tokenRows) {
      const current = byPosition.get(row.position) ?? {
        position: row.position, surface_form: row.surface_form,
        lexeme: { id: row.id, text: row.text, language: row.language, transliteration: row.transliteration, strongs_id: row.strongs_id,
          root_id: row.root_id, part_of_speech: row.part_of_speech, gloss: row.gloss },
        values: [] as Array<{ lexeme_id: number; system_id: string; value: number; reduced_value: number }>,
      };
      if (row.system_id) current.values.push({ lexeme_id: row.id, system_id: row.system_id, value: row.value, reduced_value: row.reduced_value });
      byPosition.set(row.position, current);
    }
    const matches = [...byPosition.values()].filter((word) => {
      if (params.systemId && Number.isInteger(params.value)) return word.values.some((value) => value.system_id === params.systemId && value.value === params.value);
      if (!params.query) return false;
      const q = params.query.toLowerCase();
      return word.lexeme.text.toLowerCase() === q || (word.lexeme.transliteration ?? "").toLowerCase() === q || word.surface_form.toLowerCase().includes(q);
    });
    return { ...verse, source: source_id ? sourceMap.get(source_id) ?? null : null, matches };
  });
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getBaseline(systemId: string, value: number, wordCount: number): BaselineRecord | null {
  const db = getDatabase();
  const compatible = rows<{ lexeme_id: number; value: number }>(db.prepare(`SELECT lv.lexeme_id,lv.value FROM lexeme_value lv
    WHERE lv.system_id=? ORDER BY lv.lexeme_id`), systemId);
  if (!compatible.length) return null;
  const cached = db.prepare(`SELECT match_count,total FROM baseline_sample
    WHERE corpus_id='reference-lexicon' AND system_id=? AND value=?`).get(systemId, value) as { match_count: number; total: number } | undefined;
  const matchCount = cached?.match_count ?? compatible.filter((row) => row.value === value).length;
  const total = cached?.total ?? compatible.length;
  const matching = rows<any>(db.prepare(`SELECT l.id,l.text,l.transliteration,l.gloss FROM lexeme_value lv
    JOIN lexeme l ON l.id=lv.lexeme_id WHERE lv.system_id=? AND lv.value=? ORDER BY l.language,l.text`), systemId, value);

  // Reproducible uniform-with-replacement Monte Carlo: same token count, token values drawn from this catalog.
  // This is a transparent illustrative model, not a universal probability or evidence of meaning.
  const trials = 10_000;
  const count = Math.max(1, Math.min(Math.trunc(wordCount), 8));
  const random = seededRandom(hash32(`${systemId}|${value}|${count}|reference-lexicon-v1`));
  let randomMatches = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    let sum = 0;
    for (let word = 0; word < count; word += 1) sum += compatible[Math.floor(random() * compatible.length)].value;
    if (sum === value) randomMatches += 1;
  }

  if (!cached) {
    db.prepare(`INSERT OR REPLACE INTO baseline_sample(corpus_id,system_id,value,match_count,total,sample_method)
      VALUES ('reference-lexicon',?,?,?,?,?)`).run(systemId, value, matchCount, total, "Exact same-value frequency in the curated lexeme catalog; not a universal probability.");
  }
  return {
    systemId, value, matchCount, total, matchingLexemes: matching,
    randomPhraseMatches: randomMatches, randomPhraseTrials: trials, wordCount: count,
    model: "Uniform draws with replacement from the compatible curated lexeme values; same token count; fixed seed for reproducibility.",
  };
}

export function getAnalystEvidence(query: string, topicId?: string) {
  const db = getDatabase();
  const topicRows = topicId
    ? rows<any>(db.prepare("SELECT * FROM topic WHERE id=?"), topicId)
    : rows<any>(db.prepare("SELECT * FROM topic ORDER BY title"));
  const allTopics = selectAnalystTopics(query, topicRows, topicId);
  const sourceMap = getSourceMap(db);
  const claims = allTopics.flatMap((topic) => getClaimsForTopic(db, topic.id, sourceMap));
  const relevantClaims = topicId ? claims : selectAnalystClaims(query, claims);
  const finalClaims = relevantClaims.length ? relevantClaims : claims;
  return { topics: allTopics, claims: finalClaims.slice(0, 12), sources: sourceMap };
}
