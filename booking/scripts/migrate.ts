import "./load-env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

export async function migrate(connectionString: string, log = true) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const done = new Set((await client.query<{ version: string }>("SELECT version FROM schema_migrations")).rows.map((r) => r.version));
    for (const f of files) {
      if (done.has(f)) continue;
      await client.query("BEGIN");
      try {
        await client.query(readFileSync(path.join(dir, f), "utf8"));
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [f]);
        await client.query("COMMIT");
        if (log) console.log(`✓ ${f}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL nincs beállítva");
  migrate(url).then(() => console.log("Migrációk kész.")).catch((e) => { console.error(e); process.exit(1); });
}
