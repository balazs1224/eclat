import "./load-env";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { PLACEHOLDER_CONTENT, demoSeasons } from "./seed-data";

// Idempotens: ha a szállás már létezik, nem ír felül semmit.
export async function seed(connectionString: string, log = true) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const exists = await client.query("SELECT id FROM properties WHERE slug = 'balatonboglar'");
    if (exists.rowCount) {
      if (log) console.log("A szállás már létezik — seed kihagyva.");
      return exists.rows[0].id as number;
    }
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO properties (slug, name, max_guests, base_guests, extra_guest_fee, base_nightly_rate, default_min_nights,
         booking_mode, payment_mode, deposit_percent, balance_due_days, cancellation_rules, content, ical_export_token)
       VALUES ('balatonboglar', '[PLACEHOLDER: szállás neve]', 6, 4, 5000, 35000, 2, 'request', 'deposit', 30, 14, $1, $2, $3)
       RETURNING id`,
      [
        JSON.stringify([{ daysBefore: 30, refundPercent: 100 }, { daysBefore: 14, refundPercent: 50 }, { daysBefore: 0, refundPercent: 0 }]),
        JSON.stringify(PLACEHOLDER_CONTENT),
        randomBytes(24).toString("base64url"),
      ],
    );
    const pid = rows[0].id as number;
    const thisYear = new Date().getUTCFullYear();
    for (const year of [thisYear, thisYear + 1]) {
      for (const s of demoSeasons(year)) {
        await client.query(
          `INSERT INTO seasons (property_id, name, start_date, end_date, nightly_rate, weekend_rate, min_nights, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [pid, s.name, s.start, s.end, s.rate, s.weekend, s.min, s.priority],
        );
      }
      await client.query(
        "INSERT INTO rate_overrides (property_id, date, nightly_rate, label, kind) VALUES ($1, $2, 75000, 'Augusztus 20. (DEMÓ ünnepnapi ár)', 'holiday')",
        [pid, `${year}-08-20`],
      );
    }
    await client.query(
      `INSERT INTO fees (property_id, name, kind, amount, active, sort) VALUES
        ($1, 'Takarítási díj (DEMÓ)', 'per_stay', 25000, true, 1),
        ($1, 'Idegenforgalmi adó [PLACEHOLDER: összeg ellenőrzendő]', 'per_guest_night', 0, false, 2)`,
      [pid],
    );
    await client.query(
      "INSERT INTO coupons (property_id, code, kind, value, min_nights, active) VALUES ($1, 'DEMO10', 'percent', 10, 3, true)",
      [pid],
    );
    await client.query("COMMIT");
    if (log) console.log(`Szállás létrehozva (id=${pid}) DEMÓ árakkal és PLACEHOLDER tartalommal.`);
    return pid;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed(process.env.DATABASE_URL!).catch((e) => { console.error(e); process.exit(1); });
}
