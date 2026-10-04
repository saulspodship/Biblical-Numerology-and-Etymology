PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migration (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('lexicon','primary_text','court_doc','book','news','archive','government','filing','method')),
  title TEXT NOT NULL,
  author TEXT,
  year INTEGER,
  url TEXT,
  archive_url TEXT,
  reliability_grade TEXT NOT NULL CHECK (reliability_grade IN ('A','B','C','reference')),
  access_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lexeme (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('heb','grc','arc','lat','eng','ara')),
  transliteration TEXT,
  strongs_id TEXT,
  root_id INTEGER REFERENCES lexeme(id) ON DELETE SET NULL,
  part_of_speech TEXT,
  gloss TEXT,
  notes TEXT,
  UNIQUE(text, language)
);

CREATE TABLE IF NOT EXISTS numerology_system (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('heb','grc','arc','lat','eng','ara')),
  algorithm TEXT NOT NULL,
  letter_values_json TEXT NOT NULL,
  description TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  version TEXT NOT NULL DEFAULT '1.0'
);

CREATE TABLE IF NOT EXISTS lexeme_value (
  lexeme_id INTEGER NOT NULL REFERENCES lexeme(id) ON DELETE CASCADE,
  system_id TEXT NOT NULL REFERENCES numerology_system(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value >= 0),
  reduced_value INTEGER NOT NULL CHECK (reduced_value >= 0),
  PRIMARY KEY (lexeme_id, system_id)
);

CREATE TABLE IF NOT EXISTS etymology_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexeme_id INTEGER NOT NULL REFERENCES lexeme(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  from_lexeme_id INTEGER REFERENCES lexeme(id) ON DELETE SET NULL,
  relation TEXT NOT NULL CHECK (relation IN ('derived','cognate','borrowed','semantic_note','folk_etymology')),
  explanation TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE RESTRICT,
  confidence TEXT NOT NULL CHECK (confidence IN ('DOCUMENTED','CONTESTED','SPECULATIVE','DEBUNKED')),
  UNIQUE(lexeme_id, step_order)
);

CREATE TABLE IF NOT EXISTS text_corpus (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  corpus_type TEXT NOT NULL DEFAULT 'text' CHECK (corpus_type IN ('text','lexicon')),
  source_id TEXT REFERENCES source(id) ON DELETE SET NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  license_note TEXT
);

CREATE TABLE IF NOT EXISTS verse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  corpus_id TEXT NOT NULL REFERENCES text_corpus(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_no INTEGER NOT NULL,
  text TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('heb','grc','arc','lat','eng','ara')),
  UNIQUE(corpus_id, book, chapter, verse_no)
);

CREATE TABLE IF NOT EXISTS verse_word (
  verse_id INTEGER NOT NULL REFERENCES verse(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  lexeme_id INTEGER NOT NULL REFERENCES lexeme(id) ON DELETE RESTRICT,
  surface_form TEXT NOT NULL,
  PRIMARY KEY (verse_id, position)
);

CREATE TABLE IF NOT EXISTS topic (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claim (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  made_by TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('DOCUMENTED','CONTESTED','SPECULATIVE','DEBUNKED')),
  status_note TEXT NOT NULL,
  claim_kind TEXT NOT NULL DEFAULT 'historical' CHECK (claim_kind IN ('historical','interpretation','numerological','methodological')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claim_source (
  claim_id TEXT NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE RESTRICT,
  supports TEXT NOT NULL CHECK (supports IN ('supports','disputes','context')),
  note TEXT,
  PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('person','family','company','place','organization','text')),
  bio_documented TEXT NOT NULL,
  source_id TEXT REFERENCES source(id) ON DELETE SET NULL,
  public_figure INTEGER NOT NULL DEFAULT 0 CHECK (public_figure IN (0,1))
);

CREATE TABLE IF NOT EXISTS connection (
  id TEXT PRIMARY KEY,
  from_ref_type TEXT NOT NULL CHECK (from_ref_type IN ('entity','lexeme','claim','topic')),
  from_ref_id TEXT NOT NULL,
  to_ref_type TEXT NOT NULL CHECK (to_ref_type IN ('entity','lexeme','claim','topic')),
  to_ref_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  basis TEXT NOT NULL CHECK (basis IN ('documented','numerological')),
  source_id TEXT REFERENCES source(id) ON DELETE RESTRICT,
  note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_query (
  id TEXT PRIMARY KEY,
  input_text TEXT NOT NULL,
  system_ids_json TEXT NOT NULL DEFAULT '[]',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS saved_note (
  id TEXT PRIMARY KEY,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS baseline_sample (
  corpus_id TEXT NOT NULL REFERENCES text_corpus(id) ON DELETE CASCADE,
  system_id TEXT NOT NULL REFERENCES numerology_system(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value >= 0),
  match_count INTEGER NOT NULL CHECK (match_count >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  sample_method TEXT NOT NULL DEFAULT 'exact lexeme frequency',
  PRIMARY KEY (corpus_id, system_id, value)
);

INSERT OR IGNORE INTO schema_migration(version) VALUES (1);
