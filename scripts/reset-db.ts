import fs from "node:fs";
import path from "node:path";

const configured = process.env.GEMATRIA_DB_PATH;
const dbPath = configured ? path.resolve(configured) : path.join(process.cwd(), ".data", "research-lab.sqlite");
for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (fs.existsSync(file)) fs.rmSync(file);
}
console.log(`Removed local SQLite database at ${dbPath}. It will be reseeded on the next API request.`);
