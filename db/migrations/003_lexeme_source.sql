CREATE TABLE IF NOT EXISTS lexeme_source (
  lexeme_id INTEGER NOT NULL REFERENCES lexeme(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE RESTRICT,
  relation TEXT NOT NULL CHECK (relation IN ('gloss','transliteration','etymology','textual_form')),
  confidence TEXT NOT NULL CHECK (confidence IN ('DOCUMENTED','CONTESTED','SPECULATIVE','DEBUNKED')),
  note TEXT NOT NULL,
  PRIMARY KEY (lexeme_id, source_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_lexeme_source_source ON lexeme_source(source_id);
INSERT OR IGNORE INTO schema_migration(version) VALUES (3);
