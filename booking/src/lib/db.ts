import pg from "pg";

// DATE típus (OID 1082) maradjon 'YYYY-MM-DD' szöveg — elkerüljük az időzóna-csúszást.
pg.types.setTypeParser(1082, (v: string) => v);
// BIGINT (OID 20) számként — csak kis értékeket (id, count) tárolunk így.
pg.types.setTypeParser(20, (v: string) => Number(v));

const globalForPool = globalThis as unknown as { __pgPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForPool.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL nincs beállítva");
    globalForPool.__pgPool = new pg.Pool({ connectionString, max: 10 });
  }
  return globalForPool.__pgPool;
}

export type Db = pg.Pool | pg.PoolClient;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db?: Db,
): Promise<T[]> {
  const res = await (db ?? pool()).query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db?: Db,
): Promise<T | null> {
  const rows = await query<T>(text, params, db);
  return rows[0] ?? null;
}

/** Tranzakció: hiba esetén ROLLBACK. Sorosítási ütközésnél (40001/40P01) legfeljebb 3-szor újrapróbálja. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      const code = (err as { code?: string }).code;
      if ((code === "40001" || code === "40P01") && attempt < 3) continue;
      throw err;
    } finally {
      client.release();
    }
  }
}
