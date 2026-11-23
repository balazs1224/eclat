// iCal (RFC 5545) export és import — csak egész napos foglaltsági eseményekkel.
// FONTOS: az iCal-szinkron nem valós idejű. A csatornák (Airbnb, Booking.com) a saját ütemezésük szerint
// kérik le a naptárat, így két szinkron között ugyanaz az időpont két helyen is eladható. Lásd docs/booking/ARCHITEKTURA.md.
import { query, queryOne, withTransaction } from "./db";
import { addDays, isIsoDate, todayIn } from "./dates";
import { audit } from "./audit";
import { queueEmail } from "./email";

export interface IcsEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function ymd(d: string): string {
  return d.replace(/-/g, "");
}

function stamp(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(events: IcsEvent[], calName: string, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eclat Balaton//Booking//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function parseIcsDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  return isIsoDate(d) ? d : null;
}

/** Minimális, toleráns iCal-értelmező: VEVENT UID / DTSTART / DTEND / SUMMARY / STATUS mezőket olvas. */
export function parseIcs(text: string): IcsEvent[] {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const events: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const raw of unfolded.split("\n")) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const start = cur.DTSTART ? parseIcsDate(cur.DTSTART) : null;
      let end = cur.DTEND ? parseIcsDate(cur.DTEND) : null;
      if (start && (!end || end <= start)) end = addDays(start, 1);
      if (start && end && (cur.STATUS ?? "").toUpperCase() !== "CANCELLED") {
        events.push({ uid: cur.UID || `${start}_${end}`, start, end, summary: cur.SUMMARY ?? "" });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const name = line.slice(0, idx).split(";")[0].toUpperCase();
      if (!(name in cur)) cur[name] = line.slice(idx + 1);
    }
  }
  return events;
}

/** Export: aktív foglalások és zárolások, személyes adat nélkül. excludeFeedId: az adott csatornából importált eseményeket kihagyja. */
export async function exportCalendar(propertyId: number, propertyName: string, excludeFeedId?: number | null): Promise<string> {
  const today = todayIn();
  const bookings = await query<{ id: string; check_in: string; check_out: string }>(
    `SELECT id, check_in, check_out FROM bookings
     WHERE property_id = $1 AND status IN ('pending', 'confirmed', 'paid') AND check_out >= $2`,
    [propertyId, today],
  );
  const blocks = await query<{ id: number; check_in: string; check_out: string }>(
    `SELECT id, check_in, check_out FROM blocks
     WHERE property_id = $1 AND check_out >= $2 AND ($3::int IS NULL OR feed_id IS DISTINCT FROM $3::int)`,
    [propertyId, today, excludeFeedId ?? null],
  );
  const events: IcsEvent[] = [
    ...bookings.map((b) => ({ uid: `booking-${b.id}@eclat-booking`, start: b.check_in, end: b.check_out, summary: "Foglalt" })),
    ...blocks.map((b) => ({ uid: `block-${b.id}@eclat-booking`, start: b.check_in, end: b.check_out, summary: "Nem elérhető" })),
  ];
  return buildIcs(events, propertyName);
}

const MAX_BYTES = 2 * 1024 * 1024;

async function fetchIcs(url: string): Promise<string> {
  if (!/^https:\/\//i.test(url)) throw new Error("Csak https:// naptár-URL engedélyezett.");
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "text/calendar" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("A naptárfájl túl nagy.");
  return new TextDecoder().decode(buf);
}

export interface SyncResult {
  feedId: number;
  imported: number;
  removed: number;
  conflicts: string[];
  error?: string;
}

export async function syncFeed(feedId: number, fetcher: (url: string) => Promise<string> = fetchIcs): Promise<SyncResult> {
  const feed = await queryOne<{ id: number; property_id: number; name: string; url: string }>(
    "SELECT id, property_id, name, url FROM ical_feeds WHERE id = $1",
    [feedId],
  );
  if (!feed) throw new Error("Ismeretlen naptár.");
  let text: string;
  try {
    text = await fetcher(feed.url);
  } catch (err) {
    const msg = (err as Error).message;
    await query("UPDATE ical_feeds SET last_synced_at = now(), last_status = 'error', last_error = $2 WHERE id = $1", [feedId, msg]);
    return { feedId, imported: 0, removed: 0, conflicts: [], error: msg };
  }
  const today = todayIn();
  const events = parseIcs(text).filter((e) => e.end >= today);

  return withTransaction(async (db) => {
    await query("SELECT id FROM properties WHERE id = $1 FOR UPDATE", [feed.property_id], db);
    const uids = events.map((e) => e.uid);
    const removed = await query(
      "DELETE FROM blocks WHERE feed_id = $1 AND NOT (external_uid = ANY($2::text[])) RETURNING id",
      [feedId, uids],
      db,
    );
    for (const e of events) {
      await query(
        `INSERT INTO blocks (property_id, check_in, check_out, reason, source, feed_id, external_uid)
         VALUES ($1, $2, $3, $4, 'ical', $5, $6)
         ON CONFLICT (feed_id, external_uid) WHERE feed_id IS NOT NULL
         DO UPDATE SET check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out, reason = EXCLUDED.reason`,
        [feed.property_id, e.start, e.end, `${feed.name}${e.summary ? `: ${e.summary}` : ""}`.slice(0, 200), feedId, e.uid],
        db,
      );
    }
    // Dupla foglalás észlelése: importált foglaltság ütközik saját aktív foglalással
    const conflicts = await query<{ reference: string }>(
      `SELECT DISTINCT b.reference FROM bookings b JOIN blocks k ON k.property_id = b.property_id AND k.stay && b.stay
       WHERE k.feed_id = $1 AND b.status IN ('pending', 'confirmed', 'paid')`,
      [feedId],
      db,
    );
    const refs = conflicts.map((c) => c.reference);
    await query(
      "UPDATE ical_feeds SET last_synced_at = now(), last_status = $2, last_error = $3 WHERE id = $1",
      [feedId, refs.length ? "conflict" : "ok", refs.length ? `Ütközés: ${refs.join(", ")}` : null],
      db,
    );
    if (refs.length) {
      await audit(db, "system", "ical.conflict", "ical_feed", feedId, { references: refs });
      if (process.env.EMAIL_ADMIN_TO) {
        await queueEmail(db, {
          to: process.env.EMAIL_ADMIN_TO,
          subject: `FIGYELEM: lehetséges dupla foglalás (${feed.name})`,
          text: `A(z) ${feed.name} naptárából importált foglaltság ütközik ezekkel a foglalásokkal: ${refs.join(", ")}.\nKérjük, ellenőrizze azonnal.`,
          template: "admin_ical_conflict",
        });
      }
    }
    return { feedId, imported: events.length, removed: removed.length, conflicts: refs };
  });
}

export async function syncAllFeeds(minIntervalMinutes = 10): Promise<SyncResult[]> {
  const feeds = await query<{ id: number }>(
    `SELECT id FROM ical_feeds WHERE active AND (last_synced_at IS NULL OR last_synced_at < now() - make_interval(mins => $1))`,
    [minIntervalMinutes],
  );
  const out: SyncResult[] = [];
  for (const f of feeds) out.push(await syncFeed(f.id));
  return out;
}
