CREATE TABLE IF NOT EXISTS verse_source (
  verse_id INTEGER NOT NULL REFERENCES verse(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE RESTRICT,
  relation TEXT NOT NULL CHECK (relation IN ('primary_text','translation','commentary')),
  confidence TEXT NOT NULL CHECK (confidence IN ('DOCUMENTED','CONTESTED','SPECULATIVE','DEBUNKED')),
  note TEXT NOT NULL,
  PRIMARY KEY (verse_id, source_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_verse_source_source ON verse_source(source_id);
INSERT OR IGNORE INTO schema_migration(version) VALUES (5);
