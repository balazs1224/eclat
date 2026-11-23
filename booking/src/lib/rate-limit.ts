import { queryOne, query } from "./db";

/** Egyszerű, adatbázis-alapú korlátozás (egy szálláshoz nincs szükség Redisre). true = engedélyezett. */
export async function rateLimit(key: string, max: number, windowMinutes: number): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM rate_limits WHERE key = $1 AND at > now() - make_interval(mins => $2)",
    [key, windowMinutes],
  );
  if ((row?.n ?? 0) >= max) return false;
  await query("INSERT INTO rate_limits (key) VALUES ($1)", [key]);
  return true;
}

export async function pruneRateLimits(): Promise<void> {
  await query("DELETE FROM rate_limits WHERE at < now() - interval '1 day'");
  await query("DELETE FROM login_attempts WHERE at < now() - interval '1 day'");
}
