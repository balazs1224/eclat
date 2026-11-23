// Foglalási szolgáltatás — minden írás tranzakcióban, a szállás sorának zárolásával (SELECT … FOR UPDATE).
// Ez sorosítja az azonos szállásra érkező párhuzamos foglalásokat; a bookings_no_overlap
// kizárási megkötés pedig adatbázis-szinten garantálja, hogy két aktív foglalás ne fedje át egymást.
import type pg from "pg";
import { query, queryOne, withTransaction, type Db } from "../db";
import { audit } from "../audit";
import { addDays, eachDay, todayIn } from "../dates";
import { calculateQuote, minNightsFor, type Coupon, type Quote, type QuoteRequest, type QuoteResult } from "./pricing";
import { getPropertyById, loadPricingContext, type PropertyRow } from "../property";
import { bookingReference, randomToken, sha256 } from "../security";
import {
  adminNewBooking, deliverOutbox, guestCancelled, guestConfirmed, guestPaymentReceived, guestRequestReceived, queueEmail,
} from "../email";

export const ACTIVE_STATUSES = ["hold", "pending", "confirmed", "paid"] as const;
export type BookingStatus = "hold" | "pending" | "confirmed" | "paid" | "cancelled" | "expired";

export class BookingError extends Error {
  constructor(public code: string, message: string, public httpStatus = 400, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

export interface BookingRow {
  id: string;
  reference: string;
  property_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  status: BookingStatus;
  source: "website" | "admin";
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_country: string | null;
  guest_message: string | null;
  price: Quote & { manualTotal?: boolean };
  total: number;
  deposit_due: number;
  amount_paid: number;
  coupon_id: number | null;
  hold_expires_at: string | null;
  admin_note: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
}

// ——— Segédfüggvények ———

export async function expireHolds(db: Db, propertyId?: number): Promise<number> {
  const rows = await query(
    `UPDATE bookings SET status = 'expired', updated_at = now(), hold_token_hash = NULL
     WHERE status = 'hold' AND hold_expires_at < now() ${propertyId ? "AND property_id = $1" : ""} RETURNING id`,
    propertyId ? [propertyId] : [],
    db,
  );
  return rows.length;
}

export async function findConflicts(
  db: Db | undefined,
  propertyId: number,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
): Promise<{ bookings: { id: string; reference: string }[]; blocks: { id: number; reason: string; source: string }[] }> {
  const bookings = await query<{ id: string; reference: string }>(
    `SELECT id, reference FROM bookings
     WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)')
       AND status IN ('pending', 'confirmed', 'paid', 'hold')
       AND NOT (status = 'hold' AND hold_expires_at < now())
       AND ($4::uuid IS NULL OR id <> $4::uuid)`,
    [propertyId, checkIn, checkOut, excludeBookingId ?? null],
    db,
  );
  const blocks = await query<{ id: number; reason: string; source: string }>(
    "SELECT id, reason, source FROM blocks WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)')",
    [propertyId, checkIn, checkOut],
    db,
  );
  return { bookings, blocks };
}

async function lockProperty(db: pg.PoolClient, propertyId: number): Promise<PropertyRow> {
  const p = await getPropertyById(propertyId, db, true);
  if (!p) throw new BookingError("not_found", "A szállás nem található.", 404);
  return p;
}

export async function loadCoupon(db: Db | undefined, propertyId: number, code: string | null | undefined, forUpdate = false): Promise<Coupon | null> {
  if (!code || !code.trim()) return null;
  const r = await queryOne<{
    id: number; code: string; kind: "percent" | "fixed"; value: number; valid_from: string | null; valid_to: string | null;
    min_nights: number | null; max_uses: number | null; used_count: number; active: boolean;
  }>(
    `SELECT * FROM coupons WHERE property_id = $1 AND upper(code) = upper($2) ${forUpdate ? "FOR UPDATE" : ""}`,
    [propertyId, code.trim()],
    db,
  );
  if (!r) return null;
  return {
    id: r.id, code: r.code, kind: r.kind, value: r.value, validFrom: r.valid_from, validTo: r.valid_to,
    minNights: r.min_nights, maxUses: r.max_uses, usedCount: r.used_count, active: r.active,
  };
}

function isOverlapViolation(err: unknown): boolean {
  return (err as { code?: string }).code === "23P01";
}

const unavailable = () => new BookingError("unavailable", "A kiválasztott időszak sajnos már nem szabad.", 409);

function mailData(b: BookingRow, p: PropertyRow, manageUrl?: string) {
  return {
    reference: b.reference,
    guestName: b.guest_name ?? "Vendégünk",
    checkIn: b.check_in,
    checkOut: b.check_out,
    adults: b.adults,
    children: b.children,
    quote: { ...b.price, total: b.total, deposit: b.deposit_due, balance: b.total - b.deposit_due },
    propertyName: p.name,
    status: b.status,
    manageUrl,
    bankTransferInfo: p.content.bankTransferInfo,
    cancellationText: p.content.cancellationText,
  };
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function afterCommitDelivery() {
  try {
    await deliverOutbox();
  } catch (err) {
    console.error("[email] kézbesítési hiba", err);
  }
}

// ——— Nyilvános: elérhetőség és árajánlat ———

export async function getAvailability(propertyId: number, from: string, to: string) {
  const property = await getPropertyById(propertyId);
  if (!property) throw new BookingError("not_found", "A szállás nem található.", 404);
  const ranges = await query<{ check_in: string; check_out: string }>(
    `SELECT check_in, check_out FROM bookings
       WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)')
         AND status IN ('pending', 'confirmed', 'paid', 'hold') AND NOT (status = 'hold' AND hold_expires_at < now())
     UNION ALL
     SELECT check_in, check_out FROM blocks WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)')`,
    [propertyId, from, to],
  );
  const occupied = new Set<string>();
  for (const r of ranges) for (const d of eachDay(r.check_in, r.check_out)) if (d >= from && d < to) occupied.add(d);

  const ctx = await loadPricingContext(property, from, to);
  const minNights: Record<string, number> = {};
  for (const d of eachDay(from, to)) {
    const m = minNightsFor(d, ctx);
    if (m !== property.default_min_nights) minNights[d] = m;
  }
  return {
    occupied: [...occupied].sort(),
    minNights,
    defaultMinNights: property.default_min_nights,
    today: ctx.today,
    firstBookable: addDays(ctx.today, property.min_advance_days),
    lastBookable: addDays(ctx.today, property.max_advance_days),
    maxGuests: property.max_guests,
  };
}

export async function quote(propertyId: number, req: QuoteRequest): Promise<QuoteResult & { available?: boolean }> {
  const property = await getPropertyById(propertyId);
  if (!property) throw new BookingError("not_found", "A szállás nem található.", 404);
  const ctx = await loadPricingContext(property, req.checkIn, req.checkOut);
  const coupon = await loadCoupon(undefined, propertyId, req.couponCode);
  const result = calculateQuote(ctx, req, coupon);
  if (!result.ok) return result;
  const conflicts = await findConflicts(undefined, propertyId, req.checkIn, req.checkOut);
  return { ...result, available: conflicts.bookings.length === 0 && conflicts.blocks.length === 0 };
}

// ——— Nyilvános: időkorlátos zárolás, majd véglegesítés ———

export interface HoldInput extends QuoteRequest {
  propertyId: number;
  ipHash?: string | null;
}

export async function createHold(input: HoldInput) {
  const holdMinutes = Number(process.env.BOOKING_HOLD_MINUTES ?? 15);
  try {
    return await withTransaction(async (db) => {
      const property = await lockProperty(db, input.propertyId);
      await expireHolds(db, property.id);
      const ctx = await loadPricingContext(property, input.checkIn, input.checkOut, db);
      const coupon = await loadCoupon(db, property.id, input.couponCode);
      const result = calculateQuote(ctx, input, coupon);
      if (!result.ok) throw new BookingError(result.error, result.message, 422, { minNights: result.minNights });
      if (result.quote.couponError) throw new BookingError("coupon_invalid", result.quote.couponError, 422);

      const conflicts = await findConflicts(db, property.id, input.checkIn, input.checkOut);
      if (conflicts.bookings.length || conflicts.blocks.length) throw unavailable();

      const holdToken = randomToken();
      const row = await queryOne<{ id: string; reference: string; hold_expires_at: string }>(
        `INSERT INTO bookings (reference, property_id, check_in, check_out, adults, children, status, source, price, total,
                               deposit_due, coupon_id, hold_expires_at, hold_token_hash, ip_hash)
         VALUES ($1, $2, $3, $4, $5, $6, 'hold', 'website', $7, $8, $9, $10, now() + make_interval(mins => $11), $12, $13)
         RETURNING id, reference, hold_expires_at`,
        [
          bookingReference(), property.id, input.checkIn, input.checkOut, input.adults, input.children,
          JSON.stringify(result.quote), result.quote.total, result.quote.deposit,
          result.quote.discount && coupon?.id ? coupon.id : null, holdMinutes, sha256(holdToken), input.ipHash ?? null,
        ],
        db,
      );
      return { bookingId: row!.id, holdToken, holdExpiresAt: row!.hold_expires_at, quote: result.quote };
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw unavailable();
    throw err;
  }
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  country?: string | null;
  message?: string | null;
}

export async function finalizeBooking(input: { bookingId: string; holdToken: string; guest: GuestDetails }) {
  const result = await withTransaction(async (db) => {
    const head = await queryOne<{ property_id: number }>("SELECT property_id FROM bookings WHERE id = $1", [input.bookingId], db);
    if (!head) throw new BookingError("not_found", "A foglalás nem található.", 404);
    const property = await lockProperty(db, head.property_id);
    const b = await queryOne<BookingRow & { hold_token_hash: string | null; hold_valid: boolean }>(
      "SELECT *, (hold_expires_at > now()) AS hold_valid FROM bookings WHERE id = $1 FOR UPDATE",
      [input.bookingId],
      db,
    );
    if (!b || b.status !== "hold" || !b.hold_token_hash || b.hold_token_hash !== sha256(input.holdToken))
      throw new BookingError("hold_invalid", "A foglalási munkamenet érvénytelen. Kérjük, kezdje újra.", 410);
    if (!b.hold_valid) {
      await query("UPDATE bookings SET status = 'expired', hold_token_hash = NULL, updated_at = now() WHERE id = $1", [b.id], db);
      throw new BookingError("hold_expired", "A zárolás ideje lejárt. Kérjük, ellenőrizze újra az időpontot.", 410);
    }

    if (b.coupon_id) {
      const c = await queryOne<{ max_uses: number | null; used_count: number; active: boolean }>(
        "SELECT max_uses, used_count, active FROM coupons WHERE id = $1 FOR UPDATE",
        [b.coupon_id],
        db,
      );
      if (!c || !c.active || (c.max_uses !== null && c.used_count >= c.max_uses))
        throw new BookingError("coupon_invalid", "A kuponkód időközben érvényét vesztette.", 422);
      await query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", [b.coupon_id], db);
    }

    const status: BookingStatus = property.booking_mode === "instant" ? "confirmed" : "pending";
    const accessToken = randomToken(24);
    const updated = await queryOne<BookingRow>(
      `UPDATE bookings SET status = $2, guest_name = $3, guest_email = $4, guest_phone = $5, guest_country = $6,
              guest_message = $7, hold_expires_at = NULL, hold_token_hash = NULL, access_token_hash = $8,
              privacy_accepted_at = now(), confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [b.id, status, input.guest.name, input.guest.email, input.guest.phone, input.guest.country ?? null,
       input.guest.message ?? null, sha256(accessToken)],
      db,
    );
    const manageUrl = `${appUrl()}/foglalas/${updated!.reference}?t=${accessToken}`;
    const data = mailData(updated!, property, manageUrl);
    const guestMail = status === "confirmed" ? guestConfirmed(data) : guestRequestReceived(data);
    await queueEmail(db, { to: input.guest.email, ...guestMail, template: `guest_${status}`, bookingId: b.id });
    const adminTo = process.env.EMAIL_ADMIN_TO;
    if (adminTo) {
      await queueEmail(db, {
        to: adminTo, ...adminNewBooking(data, `${appUrl()}/admin/foglalasok/${b.id}`), template: "admin_new", bookingId: b.id,
      });
    }
    await audit(db, "guest", "booking.created", "booking", b.id, { status, reference: updated!.reference });
    return { reference: updated!.reference, status, accessToken };
  });
  await afterCommitDelivery();
  return result;
}

/** A vendég visszalép: a saját zárolását azonnal felszabadítja (tokennel hitelesítve). */
export async function releaseHold(bookingId: string, holdToken: string): Promise<boolean> {
  const rows = await query(
    `UPDATE bookings SET status = 'expired', hold_token_hash = NULL, updated_at = now()
     WHERE id = $1 AND status = 'hold' AND hold_token_hash = $2 RETURNING id`,
    [bookingId, sha256(holdToken)],
  );
  return rows.length > 0;
}

export async function getBookingForGuest(reference: string, accessToken: string): Promise<BookingRow | null> {
  if (!accessToken) return null;
  return queryOne<BookingRow>(
    "SELECT * FROM bookings WHERE reference = $1 AND access_token_hash = $2 AND status <> 'hold'",
    [reference, sha256(accessToken)],
  );
}

// ——— Admin műveletek ———

const TRANSITIONS: Record<string, BookingStatus[]> = {
  confirm: ["pending"],
  cancel: ["hold", "pending", "confirmed", "paid"],
};

async function lockBooking(db: pg.PoolClient, id: string): Promise<{ booking: BookingRow; property: PropertyRow }> {
  const head = await queryOne<{ property_id: number }>("SELECT property_id FROM bookings WHERE id = $1", [id], db);
  if (!head) throw new BookingError("not_found", "A foglalás nem található.", 404);
  const property = await lockProperty(db, head.property_id);
  const booking = await queryOne<BookingRow>("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id], db);
  return { booking: booking!, property };
}

export async function adminConfirm(id: string, actor: string, notifyGuest = true) {
  await withTransaction(async (db) => {
    const { booking, property } = await lockBooking(db, id);
    if (!TRANSITIONS.confirm.includes(booking.status)) throw new BookingError("invalid_state", "Csak függőben lévő foglalás igazolható vissza.");
    const b = await queryOne<BookingRow>(
      "UPDATE bookings SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = $1 RETURNING *",
      [id],
      db,
    );
    if (notifyGuest && b!.guest_email)
      await queueEmail(db, { to: b!.guest_email, ...guestConfirmed(mailData(b!, property)), template: "guest_confirmed", bookingId: id });
    await audit(db, actor, "booking.confirmed", "booking", id);
  });
  await afterCommitDelivery();
}

export async function adminCancel(id: string, actor: string, reason: string | null, notifyGuest = true) {
  await withTransaction(async (db) => {
    const { booking, property } = await lockBooking(db, id);
    if (!TRANSITIONS.cancel.includes(booking.status)) throw new BookingError("invalid_state", "Ez a foglalás már nem mondható le.");
    const b = await queryOne<BookingRow>(
      "UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [id, reason],
      db,
    );
    if (booking.coupon_id && booking.status !== "hold")
      await query("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1", [booking.coupon_id], db);
    if (notifyGuest && b!.guest_email && booking.status !== "hold")
      await queueEmail(db, { to: b!.guest_email, ...guestCancelled(mailData(b!, property), reason), template: "guest_cancelled", bookingId: id });
    await audit(db, actor, "booking.cancelled", "booking", id, { reason, previousStatus: booking.status });
  });
  await afterCommitDelivery();
}

/**
 * Befizetés rögzítése. Kézi (átutalás/készpénz) befizetést az admin rögzít; online szolgáltatónál
 * ezt KIZÁRÓLAG hitelesített (aláírás-ellenőrzött) visszajelzés után szabad meghívni.
 */
export async function recordPayment(
  id: string,
  actor: string,
  payment: { amount: number; kind: "deposit" | "balance" | "full" | "refund"; provider: string; providerRef?: string | null; note?: string | null },
  notifyGuest = true,
) {
  if (!Number.isInteger(payment.amount) || payment.amount <= 0) throw new BookingError("invalid_amount", "Érvénytelen összeg.");
  await withTransaction(async (db) => {
    const { booking, property } = await lockBooking(db, id);
    const allowed = payment.kind === "refund" ? ["pending", "confirmed", "paid", "cancelled"] : ["pending", "confirmed", "paid"];
    if (!allowed.includes(booking.status))
      throw new BookingError("invalid_state", "Ehhez a foglaláshoz nem rögzíthető befizetés.");
    if (payment.kind === "refund" && payment.amount > booking.amount_paid)
      throw new BookingError("invalid_amount", "A visszatérítés nem lehet több a befizetett összegnél.");
    const signed = payment.kind === "refund" ? -payment.amount : payment.amount;
    await query(
      `INSERT INTO payments (booking_id, provider, kind, amount, status, provider_ref, note, verified_at, recorded_by)
       VALUES ($1, $2, $3, $4, 'succeeded', $5, $6, now(), $7)`,
      [id, payment.provider, payment.kind, signed, payment.providerRef ?? null, payment.note ?? null, actor],
      db,
    );
    const paid = booking.amount_paid + signed;
    let status: BookingStatus = booking.status;
    if (booking.status === "cancelled") status = "cancelled";
    else if (paid >= booking.total) status = "paid";
    else if (booking.status === "paid") status = "confirmed";
    else if (booking.status === "pending" && paid > 0) status = "confirmed";
    const b = await queryOne<BookingRow>(
      `UPDATE bookings SET amount_paid = $2, status = $3, updated_at = now(),
              confirmed_at = COALESCE(confirmed_at, CASE WHEN $3 IN ('confirmed', 'paid') THEN now() END)
       WHERE id = $1 RETURNING *`,
      [id, paid, status],
      db,
    );
    if (notifyGuest && b!.guest_email && payment.kind !== "refund")
      await queueEmail(db, { to: b!.guest_email, ...guestPaymentReceived(mailData(b!, property), payment.amount), template: "guest_payment", bookingId: id });
    await audit(db, actor, "payment.recorded", "booking", id, { ...payment, newStatus: status });
  });
  await afterCommitDelivery();
}

export interface AdminBookingInput {
  propertyId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: GuestDetails;
  status: "pending" | "confirmed";
  totalOverride?: number | null;
  note?: string | null;
  notifyGuest?: boolean;
}

function applyTotalOverride(q: Quote, property: PropertyRow, totalOverride?: number | null): Quote & { manualTotal?: boolean } {
  if (totalOverride === undefined || totalOverride === null) return q;
  const deposit = property.payment_mode === "deposit" && q.balanceDueDate
    ? Math.round((totalOverride * property.deposit_percent) / 100)
    : totalOverride;
  return { ...q, total: totalOverride, deposit, balance: totalOverride - deposit, manualTotal: true };
}

export async function adminCreateBooking(input: AdminBookingInput, actor: string) {
  try {
    const id = await withTransaction(async (db) => {
      const property = await lockProperty(db, input.propertyId);
      await expireHolds(db, property.id);
      const ctx = await loadPricingContext(property, input.checkIn, input.checkOut, db);
      const result = calculateQuote(ctx, input, null, { ignoreBookingRules: true });
      if (!result.ok) throw new BookingError(result.error, result.message, 422);
      const conflicts = await findConflicts(db, property.id, input.checkIn, input.checkOut);
      if (conflicts.bookings.length || conflicts.blocks.length) throw unavailable();
      const q = applyTotalOverride(result.quote, property, input.totalOverride);
      const b = await queryOne<BookingRow>(
        `INSERT INTO bookings (reference, property_id, check_in, check_out, adults, children, status, source, guest_name,
                               guest_email, guest_phone, guest_country, guest_message, price, total, deposit_due, admin_note, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9, $10, $11, $12, $13, $14, $15, $16, CASE WHEN $7 = 'confirmed' THEN now() END)
         RETURNING *`,
        [bookingReference(), property.id, input.checkIn, input.checkOut, input.adults, input.children, input.status,
         input.guest.name, input.guest.email || null, input.guest.phone || null, input.guest.country ?? null,
         input.guest.message ?? null, JSON.stringify(q), q.total, q.deposit, input.note ?? null],
        db,
      );
      if (input.notifyGuest && b!.guest_email) {
        const data = mailData(b!, property);
        const mail = input.status === "confirmed" ? guestConfirmed(data) : guestRequestReceived(data);
        await queueEmail(db, { to: b!.guest_email, ...mail, template: `guest_${input.status}`, bookingId: b!.id });
      }
      await audit(db, actor, "booking.created_manual", "booking", b!.id, { status: input.status });
      return b!.id;
    });
    await afterCommitDelivery();
    return id;
  } catch (err) {
    if (isOverlapViolation(err)) throw unavailable();
    throw err;
  }
}

export async function adminModifyBooking(
  id: string,
  actor: string,
  changes: { checkIn: string; checkOut: string; adults: number; children: number; totalOverride?: number | null; note?: string | null },
) {
  try {
    await withTransaction(async (db) => {
      const { booking, property } = await lockBooking(db, id);
      if (!["pending", "confirmed", "paid"].includes(booking.status))
        throw new BookingError("invalid_state", "Csak aktív foglalás módosítható.");
      const conflicts = await findConflicts(db, property.id, changes.checkIn, changes.checkOut, id);
      if (conflicts.bookings.length || conflicts.blocks.length) throw unavailable();
      const ctx = await loadPricingContext(property, changes.checkIn, changes.checkOut, db);
      const result = calculateQuote(ctx, changes, null, { ignoreBookingRules: true });
      if (!result.ok) throw new BookingError(result.error, result.message, 422);
      // ha nincs kézi végösszeg és a korábbi ár kedvezményt tartalmazott, a kedvezmény összegét megtartjuk
      let q: Quote = result.quote;
      if ((changes.totalOverride === undefined || changes.totalOverride === null) && booking.price.discount) {
        const d = Math.min(booking.price.discount.amount, q.total);
        q = { ...q, discount: booking.price.discount, total: q.total - d };
        q = applyTotalOverride(q, property, q.total);
        delete (q as { manualTotal?: boolean }).manualTotal;
      }
      const finalQ = applyTotalOverride(q, property, changes.totalOverride);
      const status: BookingStatus =
        booking.amount_paid >= finalQ.total && booking.amount_paid > 0 ? "paid" : booking.status === "paid" ? "confirmed" : booking.status;
      await query(
        `UPDATE bookings SET check_in = $2, check_out = $3, adults = $4, children = $5, price = $6, total = $7,
                deposit_due = $8, status = $9, admin_note = COALESCE($10, admin_note), updated_at = now() WHERE id = $1`,
        [id, changes.checkIn, changes.checkOut, changes.adults, changes.children, JSON.stringify(finalQ), finalQ.total,
         finalQ.deposit, status, changes.note ?? null],
        db,
      );
      await audit(db, actor, "booking.modified", "booking", id, {
        before: { checkIn: booking.check_in, checkOut: booking.check_out, total: booking.total },
        after: { checkIn: changes.checkIn, checkOut: changes.checkOut, total: finalQ.total },
      });
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw unavailable();
    throw err;
  }
}

export async function adminUpdateNote(id: string, actor: string, note: string) {
  await query("UPDATE bookings SET admin_note = $2, updated_at = now() WHERE id = $1", [id, note]);
  await audit(undefined, actor, "booking.note", "booking", id);
}

// ——— Zárolt időpontok ———

export async function createBlock(propertyId: number, checkIn: string, checkOut: string, reason: string, actor: string) {
  if (checkOut <= checkIn) throw new BookingError("invalid_dates", "A zárolás vége legyen a kezdete után.");
  return withTransaction(async (db) => {
    const property = await lockProperty(db, propertyId);
    const conflicts = await findConflicts(db, property.id, checkIn, checkOut);
    if (conflicts.bookings.length)
      throw new BookingError("conflict", `Az időszakban aktív foglalás van: ${conflicts.bookings.map((b) => b.reference).join(", ")}`, 409);
    const row = await queryOne<{ id: number }>(
      "INSERT INTO blocks (property_id, check_in, check_out, reason, source) VALUES ($1, $2, $3, $4, 'manual') RETURNING id",
      [property.id, checkIn, checkOut, reason],
      db,
    );
    await audit(db, actor, "block.created", "block", row!.id, { checkIn, checkOut, reason });
    return row!.id;
  });
}

export async function deleteBlock(id: number, actor: string) {
  await withTransaction(async (db) => {
    const rows = await query("DELETE FROM blocks WHERE id = $1 AND source = 'manual' RETURNING id", [id], db);
    if (!rows.length) throw new BookingError("not_found", "Csak kézi zárolás törölhető.");
    await audit(db, actor, "block.deleted", "block", id);
  });
}

export { todayIn };
