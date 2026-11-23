import { query, queryOne } from "./db";
import { addDays, diffDays, todayIn } from "./dates";
import type { BookingRow } from "./booking/service";

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}

export async function listBookings(propertyId: number, f: BookingFilters, limit = 300): Promise<BookingRow[]> {
  const where = ["property_id = $1", "status <> 'hold'"];
  const params: unknown[] = [propertyId];
  if (f.status && f.status !== "all") {
    if (f.status === "active") where.push("status IN ('pending','confirmed','paid')");
    else { params.push(f.status); where.push(`status = $${params.length}`); }
  } else if (!f.status) where.push("status <> 'expired'");
  if (f.from) { params.push(f.from); where.push(`check_out > $${params.length}`); }
  if (f.to) { params.push(f.to); where.push(`check_in < $${params.length}`); }
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(reference ILIKE $${params.length} OR guest_name ILIKE $${params.length} OR guest_email ILIKE $${params.length})`);
  }
  params.push(limit);
  return query<BookingRow>(`SELECT * FROM bookings WHERE ${where.join(" AND ")} ORDER BY check_in DESC LIMIT $${params.length}`, params);
}

export async function dashboard(propertyId: number) {
  const today = todayIn();
  const in30 = addDays(today, 30);
  const year = today.slice(0, 4);
  const [pending, arrivals, money, occ, feeds, recent] = await Promise.all([
    queryOne<{ n: number }>("SELECT count(*)::int AS n FROM bookings WHERE property_id = $1 AND status = 'pending'", [propertyId]),
    query<BookingRow>(
      "SELECT * FROM bookings WHERE property_id = $1 AND status IN ('pending','confirmed','paid') AND check_in >= $2 ORDER BY check_in LIMIT 8",
      [propertyId, today],
    ),
    queryOne<{ revenue: number; paid: number; outstanding: number }>(
      `SELECT coalesce(sum(total), 0)::int AS revenue, coalesce(sum(amount_paid), 0)::int AS paid,
              coalesce(sum(greatest(total - amount_paid, 0)), 0)::int AS outstanding
       FROM bookings WHERE property_id = $1 AND status IN ('confirmed','paid','pending') AND extract(year FROM check_in) = $2`,
      [propertyId, Number(year)],
    ),
    queryOne<{ nights: number }>(
      `SELECT coalesce(sum(upper(r) - lower(r)), 0)::int AS nights FROM (
         SELECT stay * daterange($2::date, $3::date, '[)') AS r FROM bookings
          WHERE property_id = $1 AND status IN ('pending','confirmed','paid') AND stay && daterange($2::date, $3::date, '[)')
         UNION ALL
         SELECT stay * daterange($2::date, $3::date, '[)') FROM blocks WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)')
       ) x`,
      [propertyId, today, in30],
    ),
    query<{ id: number; name: string; last_status: string | null; last_error: string | null; last_synced_at: string | null }>(
      "SELECT id, name, last_status, last_error, last_synced_at FROM ical_feeds WHERE property_id = $1 AND active ORDER BY name",
      [propertyId],
    ),
    query<BookingRow>("SELECT * FROM bookings WHERE property_id = $1 AND status <> 'hold' AND status <> 'expired' ORDER BY created_at DESC LIMIT 6", [propertyId]),
  ]);
  return {
    pending: pending?.n ?? 0,
    arrivals,
    year,
    revenue: money?.revenue ?? 0,
    paid: money?.paid ?? 0,
    outstanding: money?.outstanding ?? 0,
    occupancy30: Math.round(((occ?.nights ?? 0) / 30) * 100),
    feeds,
    recent,
  };
}

export async function monthReport(propertyId: number, year: number) {
  const rows = await query<{ month: number; bookings: number; nights: number; revenue: number; paid: number; website: number; admin: number; cancelled: number }>(
    `SELECT extract(month FROM check_in)::int AS month,
            count(*) FILTER (WHERE status IN ('pending','confirmed','paid'))::int AS bookings,
            coalesce(sum(check_out - check_in) FILTER (WHERE status IN ('pending','confirmed','paid')), 0)::int AS nights,
            coalesce(sum(total) FILTER (WHERE status IN ('confirmed','paid')), 0)::int AS revenue,
            coalesce(sum(amount_paid) FILTER (WHERE status IN ('confirmed','paid')), 0)::int AS paid,
            count(*) FILTER (WHERE source = 'website' AND status IN ('pending','confirmed','paid'))::int AS website,
            count(*) FILTER (WHERE source = 'admin' AND status IN ('pending','confirmed','paid'))::int AS admin,
            count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
     FROM bookings WHERE property_id = $1 AND extract(year FROM check_in) = $2 AND status <> 'hold' AND status <> 'expired'
     GROUP BY 1 ORDER BY 1`,
    [propertyId, year],
  );
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const r = rows.find((x) => x.month === i + 1);
    const daysInMonth = diffDays(`${year}-${String(i + 1).padStart(2, "0")}-01`, i === 11 ? `${year + 1}-01-01` : `${year}-${String(i + 2).padStart(2, "0")}-01`);
    return {
      month: i + 1,
      bookings: r?.bookings ?? 0, nights: r?.nights ?? 0, revenue: r?.revenue ?? 0, paid: r?.paid ?? 0,
      website: r?.website ?? 0, admin: r?.admin ?? 0, cancelled: r?.cancelled ?? 0,
      occupancy: Math.round(((r?.nights ?? 0) / daysInMonth) * 100),
    };
  });
  return byMonth;
}
