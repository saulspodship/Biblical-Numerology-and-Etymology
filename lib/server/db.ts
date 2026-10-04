import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { seedDatabase } from "@/lib/server/seed";

declare global {
  // eslint-disable-next-line no-var
  var __gematriaLabDb: Database.Database | undefined;
}

function applyMigrations(db: Database.Database) {
  const migrationDir = path.join(process.cwd(), "db", "migrations");
  const initial = fs.readFileSync(path.join(migrationDir, "001_initial.sql"), "utf8");
  db.exec(initial);

  const applied = db.prepare("SELECT version FROM schema_migration").all() as Array<{ version: number }>;
  const versions = new Set(applied.map((row) => row.version));
  if (!versions.has(2)) {
    db.exec(fs.readFileSync(path.join(migrationDir, "002_indexes.sql"), "utf8"));
  }
  const afterIndexes = db.prepare("SELECT version FROM schema_migration").all() as Array<{ version: number }>;
  if (!afterIndexes.some((row) => row.version === 3)) {
    db.exec(fs.readFileSync(path.join(migrationDir, "003_lexeme_source.sql"), "utf8"));
  }
  const afterLexemeSources = db.prepare("SELECT version FROM schema_migration").all() as Array<{ version: number }>;
  if (!afterLexemeSources.some((row) => row.version === 4)) {
    db.exec(fs.readFileSync(path.join(migrationDir, "004_system_label_updates.sql"), "utf8"));
  }
  const afterLabels = db.prepare("SELECT version FROM schema_migration").all() as Array<{ version: number }>;
  if (!afterLabels.some((row) => row.version === 5)) {
    db.exec(fs.readFileSync(path.join(migrationDir, "005_verse_source.sql"), "utf8"));
  }
}

export function getDatabase(): Database.Database {
  if (globalThis.__gematriaLabDb) return globalThis.__gematriaLabDb;
  const configuredPath = process.env.GEMATRIA_DB_PATH;
  const defaultDbPath = process.env.VERCEL
    ? path.join(tmpdir(), "gematria-lab", "research-lab.sqlite")
    : path.join(process.cwd(), ".data", "research-lab.sqlite");
  const dbPath = configuredPath ? path.resolve(configuredPath) : defaultDbPath;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  try { fs.chmodSync(path.dirname(dbPath), 0o700); } catch { /* filesystem may not support POSIX permissions */ }

  const db = new Database(dbPath);
  try { if (dbPath !== ":memory:") fs.chmodSync(dbPath, 0o600); } catch { /* filesystem may not support POSIX permissions */ }
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  applyMigrations(db);
  db.transaction(() => seedDatabase(db))();
  globalThis.__gematriaLabDb = db;
  return db;
}

export function closeDatabaseForTests() {
  if (globalThis.__gematriaLabDb) {
    globalThis.__gematriaLabDb.close();
    globalThis.__gematriaLabDb = undefined;
  }
}
