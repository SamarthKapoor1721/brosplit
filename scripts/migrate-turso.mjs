/**
 * Applies pending Prisma migration SQL files to the production (Turso/libSQL)
 * database. This replaces `prisma migrate deploy`, which cannot connect to
 * `libsql://` URLs.
 *
 * Workflow:
 *   - Dev: `npx prisma migrate dev --name <change>` generates a new folder in
 *     prisma/migrations/ and applies it to the local SQLite db.
 *   - Deploy: this script runs (via the `build` script) and applies any
 *     migration folders that aren't yet recorded in the Turso `_migrations`
 *     table, in lexicographic folder order.
 *
 * It is a no-op when TURSO_DATABASE_URL is not set, so local `next build`
 * (which targets the local SQLite file) is unaffected.
 */
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.log("[migrate-turso] TURSO_DATABASE_URL not set — skipping (local/non-Turso build).");
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");

if (!existsSync(migrationsDir)) {
  console.log("[migrate-turso] No prisma/migrations directory — nothing to apply.");
  process.exit(0);
}

const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const client = createClient(authToken ? { url, authToken } : { url });

try {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS "_migrations" (
       "name"       TEXT PRIMARY KEY,
       "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );

  const applied = new Set(
    (await client.execute(`SELECT name FROM "_migrations"`)).rows.map((r) => r.name)
  );

  const pending = folders.filter((name) => !applied.has(name));
  if (pending.length === 0) {
    console.log("[migrate-turso] Database is up to date — no pending migrations.");
    process.exit(0);
  }

  for (const name of pending) {
    const sqlPath = join(migrationsDir, name, "migration.sql");
    if (!existsSync(sqlPath)) {
      console.warn(`[migrate-turso] ${name}: no migration.sql, skipping.`);
      continue;
    }
    const sql = readFileSync(sqlPath, "utf8");
    console.log(`[migrate-turso] Applying ${name}…`);
    await client.executeMultiple(sql);
    await client.execute({ sql: `INSERT INTO "_migrations" (name) VALUES (?)`, args: [name] });
    console.log(`[migrate-turso] ✓ ${name}`);
  }

  console.log(`[migrate-turso] Done — applied ${pending.length} migration(s).`);
} catch (err) {
  console.error("[migrate-turso] Migration failed:", err);
  process.exit(1);
} finally {
  client.close();
}
