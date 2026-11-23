// Integrációs tesztek valódi PostgreSQL-lel (TEST_DATABASE_URL). A tesztadatbázis tartalmát TÖRLI.
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import pg from "pg";

const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://booking:booking@localhost:5432/booking_test";
process.env.DATABASE_URL = TEST_URL;
process.env.APP_SECRET ??= "test-secret-test-secret";
process.env.EMAIL_DRIVER = "outbox";
process.env.EMAIL_ADMIN_TO = "admin@example.test";

const { migrate } = await import("../scripts/migrate");
const { seed } = await import("../scripts/seed");
const { pool, query, queryOne } = await import("@/lib/db");
const svc = await import("@/lib/booking/service");
const { addDays, todayIn } = await import("@/lib/dates");
const { syncFeed, exportCalendar, parseIcs } = await import("@/lib/ical");

let propertyId: number;
// Szezonon kívüli időpontok a következő év márciusában (alapár, min. 2 éjszaka)
const year = Number(todayIn().slice(0, 4)) + 1;
const d = (day: number) => `${year}-03-${String(day).padStart(2, "0")}`;

async function resetDb() {
  const admin = new pg.Client({ connectionString: TEST_URL });
  await admin.connect();
  await admin.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await admin.end();
}

const guest = { name: "Teszt Vendég", email: "vendeg@example.test", phone: "+36 1 234 5678" };

beforeAll(async () => {
  await resetDb();
  await migrate(TEST_URL, false);
  propertyId = await seed(TEST_URL, false);
});

beforeEach(async () => {
  await query("TRUNCATE bookings, blocks, payments, email_outbox, audit_log, ical_feeds RESTART IDENTITY CASCADE");
  await query("UPDATE coupons SET used_count = 0, max_uses = NULL");
  await query("UPDATE properties SET booking_mode = 'request'");
});

afterAll(async () => {
  await pool().end();
});

describe("zárolás és véglegesítés", () => {
  it("létrehoz egy zárolást, majd véglegesíti függőben státusszal és e-maileket állít sorba", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    expect(hold.quote.nights).toBe(3);
    const res = await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    expect(res.status).toBe("pending");
    const mails = await query<{ to_addr: string; template: string; status: string }>("SELECT to_addr, template, status FROM email_outbox ORDER BY id");
    expect(mails.map((m) => m.template)).toEqual(["guest_pending", "admin_new"]);
    expect(mails.every((m) => m.status === "logged")).toBe(true);
    const b = await svc.getBookingForGuest(res.reference, res.accessToken);
    expect(b?.guest_email).toBe(guest.email);
    expect(await svc.getBookingForGuest(res.reference, "rossz-token")).toBeNull();
  });

  it("azonnali foglalás módban visszaigazolt státuszt kap", async () => {
    await query("UPDATE properties SET booking_mode = 'instant'");
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    const res = await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    expect(res.status).toBe("confirmed");
  });

  it("hibás zárolási tokennel nem véglegesíthető", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await expect(svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: "x", guest })).rejects.toMatchObject({ code: "hold_invalid" });
  });

  it("lejárt zárolás nem véglegesíthető, és felszabadítja az időpontot", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await query("UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = $1", [hold.bookingId]);
    await expect(svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest })).rejects.toMatchObject({ code: "hold_expired" });
    const again = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    expect(again.bookingId).not.toBe(hold.bookingId);
  });
});

describe("dupla foglalás elleni védelem", () => {
  it("aktív zárolás alatt ugyanaz az időszak nem foglalható", async () => {
    await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(5), adults: 2, children: 0 });
    await expect(svc.createHold({ propertyId, checkIn: d(3), checkOut: d(6), adults: 2, children: 0 })).rejects.toMatchObject({ code: "unavailable" });
  });

  it("csatlakozó időszakok (távozás napja = érkezés napja) foglalhatók", async () => {
    await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    const next = await svc.createHold({ propertyId, checkIn: d(4), checkOut: d(7), adults: 2, children: 0 });
    expect(next.quote.nights).toBe(3);
  });

  it("párhuzamos kérések közül pontosan egy kap zárolást", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        svc.createHold({ propertyId, checkIn: d(10 + (i % 2)), checkOut: d(14), adults: 2, children: 0 }),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    expect(ok).toHaveLength(1);
    for (const a of attempts) if (a.status === "rejected") expect((a.reason as { code: string }).code).toBe("unavailable");
    const active = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM bookings WHERE status = 'hold'");
    expect(active!.n).toBe(1);
  });

  it("az adatbázis kizárási megkötése a szolgáltatás megkerülésekor is véd", async () => {
    await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(5), adults: 2, children: 0 });
    await expect(
      query(
        `INSERT INTO bookings (reference, property_id, check_in, check_out, adults, status, price, total, deposit_due)
         VALUES ('EB-RAW', $1, $2, $3, 2, 'confirmed', '{}', 0, 0)`,
        [propertyId, d(2), d(3)],
      ),
    ).rejects.toMatchObject({ code: "23P01" });
  });

  it("zárolt időpont (block) nem foglalható, és foglalás alatti időszak nem zárolható", async () => {
    await svc.createBlock(propertyId, d(1), d(5), "Karbantartás", "test");
    await expect(svc.createHold({ propertyId, checkIn: d(2), checkOut: d(4), adults: 2, children: 0 })).rejects.toMatchObject({ code: "unavailable" });
    const hold = await svc.createHold({ propertyId, checkIn: d(10), checkOut: d(13), adults: 2, children: 0 });
    await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    await expect(svc.createBlock(propertyId, d(11), d(12), "x", "test")).rejects.toMatchObject({ code: "conflict" });
  });

  it("lemondott foglalás felszabadítja az időszakot", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    await svc.adminCancel(hold.bookingId, "test", "teszt", false);
    const again = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    expect(again.bookingId).toBeTruthy();
  });
});

describe("státuszok és fizetés", () => {
  it("függőben → visszaigazolt → előleg → fizetett", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    await svc.adminConfirm(hold.bookingId, "test");
    const b1 = await queryOne<{ status: string; total: number; deposit_due: number }>("SELECT status, total, deposit_due FROM bookings WHERE id = $1", [hold.bookingId]);
    expect(b1!.status).toBe("confirmed");
    await svc.recordPayment(hold.bookingId, "test", { amount: b1!.deposit_due, kind: "deposit", provider: "manual" });
    expect((await queryOne<{ status: string }>("SELECT status FROM bookings WHERE id = $1", [hold.bookingId]))!.status).toBe("confirmed");
    await svc.recordPayment(hold.bookingId, "test", { amount: b1!.total - b1!.deposit_due, kind: "balance", provider: "manual" });
    const b2 = await queryOne<{ status: string; amount_paid: number }>("SELECT status, amount_paid FROM bookings WHERE id = $1", [hold.bookingId]);
    expect(b2).toEqual({ status: "paid", amount_paid: b1!.total });
  });

  it("csak függőben lévő foglalás igazolható vissza; lemondott foglaláshoz nem rögzíthető fizetés", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    await svc.adminCancel(hold.bookingId, "test", null, false);
    await expect(svc.adminConfirm(hold.bookingId, "test")).rejects.toMatchObject({ code: "invalid_state" });
    await expect(svc.recordPayment(hold.bookingId, "test", { amount: 1000, kind: "deposit", provider: "manual" })).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("ugyanaz a szolgáltatói tranzakció nem rögzíthető kétszer (idempotencia)", async () => {
    const hold = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0 });
    await svc.finalizeBooking({ bookingId: hold.bookingId, holdToken: hold.holdToken, guest });
    await svc.recordPayment(hold.bookingId, "test", { amount: 1000, kind: "deposit", provider: "manual", providerRef: "TX1" });
    await expect(svc.recordPayment(hold.bookingId, "test", { amount: 1000, kind: "deposit", provider: "manual", providerRef: "TX1" })).rejects.toBeTruthy();
    const paid = await queryOne<{ amount_paid: number }>("SELECT amount_paid FROM bookings WHERE id = $1", [hold.bookingId]);
    expect(paid!.amount_paid).toBe(1000);
  });
});

describe("kupon felhasználási limit", () => {
  it("max_uses = 1 mellett a második véglegesítés elutasításra kerül", async () => {
    await query("UPDATE coupons SET max_uses = 1 WHERE code = 'DEMO10'");
    const h1 = await svc.createHold({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0, couponCode: "demo10" });
    const h2 = await svc.createHold({ propertyId, checkIn: d(10), checkOut: d(13), adults: 2, children: 0, couponCode: "DEMO10" });
    expect(h1.quote.discount?.code).toBe("DEMO10");
    await svc.finalizeBooking({ bookingId: h1.bookingId, holdToken: h1.holdToken, guest });
    await expect(svc.finalizeBooking({ bookingId: h2.bookingId, holdToken: h2.holdToken, guest })).rejects.toMatchObject({ code: "coupon_invalid" });
  });
});

describe("admin foglalás és módosítás", () => {
  it("kézi foglalás figyelmen kívül hagyja a minimum éjszakaszámot, de ütközést nem enged", async () => {
    const id = await svc.adminCreateBooking(
      { propertyId, checkIn: d(1), checkOut: d(2), adults: 2, children: 0, guest, status: "confirmed", totalOverride: 50000 },
      "test",
    );
    const b = await queryOne<{ total: number; status: string; source: string }>("SELECT total, status, source FROM bookings WHERE id = $1", [id]);
    expect(b).toEqual({ total: 50000, status: "confirmed", source: "admin" });
    await expect(
      svc.adminCreateBooking({ propertyId, checkIn: d(1), checkOut: d(3), adults: 2, children: 0, guest, status: "pending" }, "test"),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("módosításkor saját magával nem ütközik, mással igen", async () => {
    const a = await svc.adminCreateBooking({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0, guest, status: "confirmed" }, "test");
    await svc.adminCreateBooking({ propertyId, checkIn: d(10), checkOut: d(12), adults: 2, children: 0, guest, status: "confirmed" }, "test");
    await svc.adminModifyBooking(a, "test", { checkIn: d(2), checkOut: d(6), adults: 3, children: 0 });
    const b = await queryOne<{ check_in: string; adults: number }>("SELECT check_in, adults FROM bookings WHERE id = $1", [a]);
    expect(b).toEqual({ check_in: d(2), adults: 3 });
    await expect(svc.adminModifyBooking(a, "test", { checkIn: d(5), checkOut: d(11), adults: 2, children: 0 })).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("elérhetőség és iCal", () => {
  it("az elérhetőség a foglalt éjszakákat adja vissza (a távozás napja szabad)", async () => {
    await svc.adminCreateBooking({ propertyId, checkIn: d(5), checkOut: d(8), adults: 2, children: 0, guest, status: "confirmed" }, "test");
    const av = await svc.getAvailability(propertyId, d(1), d(20));
    expect(av.occupied).toEqual([d(5), d(6), d(7)]);
  });

  it("iCal export személyes adat nélkül; import ütközést jelez", async () => {
    await svc.adminCreateBooking({ propertyId, checkIn: d(5), checkOut: d(8), adults: 2, children: 0, guest, status: "confirmed" }, "test");
    const ics = await exportCalendar(propertyId, "Teszt");
    expect(ics).toContain(`DTSTART;VALUE=DATE:${d(5).replace(/-/g, "")}`);
    expect(ics).not.toContain(guest.name);
    expect(parseIcs(ics)).toHaveLength(1);

    const feed = await queryOne<{ id: number }>(
      "INSERT INTO ical_feeds (property_id, name, url) VALUES ($1, 'Airbnb', 'https://example.test/cal.ics') RETURNING id",
      [propertyId],
    );
    const external = [
      "BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:abc@airbnb", `DTSTART;VALUE=DATE:${d(7).replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${d(9).replace(/-/g, "")}`, "SUMMARY:Reserved", "END:VEVENT",
      "BEGIN:VEVENT", "UID:old@airbnb", `DTSTART;VALUE=DATE:${addDays(todayIn(), -20).replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${addDays(todayIn(), -18).replace(/-/g, "")}`, "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const res = await syncFeed(feed!.id, async () => external);
    expect(res.imported).toBe(1);
    expect(res.conflicts).toHaveLength(1);
    // újraszinkron üres naptárral eltávolítja az importált zárolást
    const res2 = await syncFeed(feed!.id, async () => "BEGIN:VCALENDAR\r\nEND:VCALENDAR");
    expect(res2.removed).toBe(1);
    // a csatornának szóló exportból kihagyható a saját importja
    await syncFeed(feed!.id, async () => external);
    expect(parseIcs(await exportCalendar(propertyId, "T", feed!.id))).toHaveLength(1);
    expect(parseIcs(await exportCalendar(propertyId, "T"))).toHaveLength(2);
  });
});

describe("visszatérítés lemondás után", () => {
  it("lemondott foglaláshoz visszatérítés rögzíthető, de legfeljebb a befizetett összeg", async () => {
    const id = await svc.adminCreateBooking({ propertyId, checkIn: d(1), checkOut: d(4), adults: 2, children: 0, guest, status: "confirmed" }, "test");
    await svc.recordPayment(id, "test", { amount: 30000, kind: "deposit", provider: "manual" }, false);
    await svc.adminCancel(id, "test", null, false);
    await expect(svc.recordPayment(id, "test", { amount: 40000, kind: "refund", provider: "manual" }, false)).rejects.toMatchObject({ code: "invalid_amount" });
    await svc.recordPayment(id, "test", { amount: 30000, kind: "refund", provider: "manual" }, false);
    const b = await queryOne<{ status: string; amount_paid: number }>("SELECT status, amount_paid FROM bookings WHERE id = $1", [id]);
    expect(b).toEqual({ status: "cancelled", amount_paid: 0 });
  });
});
