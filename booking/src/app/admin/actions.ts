"use server";
// Admin szerveroldali műveletek. Minden művelet: jogosultság-ellenőrzés → validáció → tranzakciós szolgáltatás → audit.
// A Next.js Server Actions beépítetten ellenőrzi az Origin fejlécet (CSRF-védelem).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import sharp from "sharp";
import { login, logout, requireAdmin } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isIsoDate } from "@/lib/dates";
import { getProperty } from "@/lib/property";
import { deliverOutbox } from "@/lib/email";
import { syncFeed } from "@/lib/ical";
import {
  adminCancel, adminConfirm, adminCreateBooking, adminModifyBooking, adminUpdateNote, BookingError, createBlock, deleteBlock, recordPayment,
} from "@/lib/booking/service";

// ——— segédfüggvények ———
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optInt = (f: FormData, k: string) => {
  const v = s(f, k).replace(/\s/g, "");
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new BookingError("validation", `Érvénytelen szám: ${k}`);
  return n;
};
const int = (f: FormData, k: string) => {
  const n = optInt(f, k);
  if (n === null) throw new BookingError("validation", `Hiányzó érték: ${k}`);
  return n;
};
const date = (f: FormData, k: string) => {
  const v = s(f, k);
  if (!isIsoDate(v)) throw new BookingError("validation", "Érvénytelen dátum.");
  return v;
};
const optDate = (f: FormData, k: string) => (s(f, k) ? date(f, k) : null);
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

function withMsg(path: string, kind: "msg" | "err", text: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(text)}`;
}

/** Futtatja a műveletet, majd visszairányít üzenettel. A redirect a try/catch-en kívül hívódik. */
async function run(path: string, okText: string, fn: () => Promise<void | string>) {
  let target: string;
  try {
    const custom = await fn();
    target = withMsg(typeof custom === "string" ? custom : path, "msg", okText);
  } catch (err) {
    const text = err instanceof BookingError ? err.message : err instanceof z.ZodError ? "Hibás adat." : "Váratlan hiba történt.";
    if (!(err instanceof BookingError)) console.error("[admin]", err);
    target = withMsg(path, "err", text);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect(target);
}

async function propertyId(): Promise<number> {
  const p = await getProperty();
  if (!p) throw new BookingError("not_found", "Nincs szállás.");
  return p.id;
}

// ——— hitelesítés ———
export async function loginAction(formData: FormData) {
  const res = await login(s(formData, "email"), String(formData.get("password") ?? ""));
  if (!res.ok) redirect(withMsg("/admin/login", "err", res.message));
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

// ——— foglalások ———
export async function confirmBookingAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  await run(`/admin/foglalasok/${id}`, "Foglalás visszaigazolva.", () => adminConfirm(id, user.email, bool(formData, "notify")));
}

export async function cancelBookingAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  await run(`/admin/foglalasok/${id}`, "Foglalás lemondva.", () =>
    adminCancel(id, user.email, s(formData, "reason") || null, bool(formData, "notify")),
  );
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  await run(`/admin/foglalasok/${id}`, "Befizetés rögzítve.", async () => {
    const kind = z.enum(["deposit", "balance", "full", "refund"]).parse(s(formData, "kind"));
    await recordPayment(id, user.email, {
      amount: int(formData, "amount"), kind, provider: "manual", note: s(formData, "note") || null,
    }, bool(formData, "notify"));
  });
}

export async function modifyBookingAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  await run(`/admin/foglalasok/${id}`, "Foglalás módosítva.", () =>
    adminModifyBooking(id, user.email, {
      checkIn: date(formData, "checkIn"), checkOut: date(formData, "checkOut"),
      adults: int(formData, "adults"), children: int(formData, "children"), totalOverride: optInt(formData, "totalOverride"),
    }),
  );
}

export async function noteAction(formData: FormData) {
  const user = await requireAdmin();
  const id = s(formData, "id");
  await run(`/admin/foglalasok/${id}`, "Megjegyzés mentve.", () => adminUpdateNote(id, user.email, s(formData, "note")));
}

export async function createManualBookingAction(formData: FormData) {
  const user = await requireAdmin();
  await run("/admin/foglalasok/uj", "Foglalás rögzítve.", async () => {
    const email = s(formData, "email");
    if (email && !z.string().email().safeParse(email).success) throw new BookingError("validation", "Érvénytelen e-mail-cím.");
    const id = await adminCreateBooking({
      propertyId: await propertyId(),
      checkIn: date(formData, "checkIn"), checkOut: date(formData, "checkOut"),
      adults: int(formData, "adults"), children: optInt(formData, "children") ?? 0,
      guest: { name: s(formData, "name") || "Kézi foglalás", email, phone: s(formData, "phone"), country: s(formData, "country") || null, message: s(formData, "message") || null },
      status: s(formData, "status") === "confirmed" ? "confirmed" : "pending",
      totalOverride: optInt(formData, "totalOverride"),
      note: s(formData, "note") || null,
      notifyGuest: bool(formData, "notify"),
    }, user.email);
    return `/admin/foglalasok/${id}`;
  });
}

// ——— zárolások ———
export async function createBlockAction(formData: FormData) {
  const user = await requireAdmin();
  await run("/admin/naptar", "Időszak zárolva.", async () => {
    await createBlock(await propertyId(), date(formData, "checkIn"), date(formData, "checkOut"), s(formData, "reason"), user.email);
  });
}

export async function deleteBlockAction(formData: FormData) {
  const user = await requireAdmin();
  await run("/admin/naptar", "Zárolás törölve.", () => deleteBlock(int(formData, "id"), user.email));
}

// ——— árak és szabályok (tulajdonos) ———
export async function updateRulesAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Beállítások mentve.", async () => {
    const weekend = formData.getAll("weekendNights").map(Number).filter((n) => n >= 1 && n <= 7);
    const rules = lines(s(formData, "cancellationRules")).map((l) => {
      const m = /^(\d+)\s*[:;,]\s*(\d+)$/.exec(l);
      if (!m) throw new BookingError("validation", "Lemondási szabály formátuma: napok:százalék (pl. 30:100)");
      return { daysBefore: Number(m[1]), refundPercent: Math.min(100, Number(m[2])) };
    });
    const v = {
      base_nightly_rate: int(formData, "baseNightlyRate"), extra_guest_fee: int(formData, "extraGuestFee"),
      base_guests: int(formData, "baseGuests"), max_guests: int(formData, "maxGuests"),
      default_min_nights: int(formData, "defaultMinNights"), min_advance_days: int(formData, "minAdvanceDays"),
      max_advance_days: int(formData, "maxAdvanceDays"), deposit_percent: int(formData, "depositPercent"),
      balance_due_days: int(formData, "balanceDueDays"),
      booking_mode: z.enum(["request", "instant"]).parse(s(formData, "bookingMode")),
      payment_mode: z.enum(["deposit", "full"]).parse(s(formData, "paymentMode")),
    };
    if (v.base_guests > v.max_guests) throw new BookingError("validation", "Az alapárban foglalt vendégszám nem lehet több a maximumnál.");
    await query(
      `UPDATE properties SET base_nightly_rate=$2, extra_guest_fee=$3, base_guests=$4, max_guests=$5, default_min_nights=$6,
         min_advance_days=$7, max_advance_days=$8, deposit_percent=$9, balance_due_days=$10, booking_mode=$11, payment_mode=$12,
         weekend_nights=$13, cancellation_rules=$14, check_in_time=$15, check_out_time=$16, updated_at=now() WHERE id=$1`,
      [await propertyId(), v.base_nightly_rate, v.extra_guest_fee, v.base_guests, v.max_guests, v.default_min_nights,
       v.min_advance_days, v.max_advance_days, v.deposit_percent, v.balance_due_days, v.booking_mode, v.payment_mode,
       weekend, JSON.stringify(rules), s(formData, "checkInTime") || "[PLACEHOLDER]", s(formData, "checkOutTime") || "[PLACEHOLDER]"],
    );
    await audit(undefined, user.email, "settings.rules", "property", null, v);
  });
}

export async function upsertSeasonAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Szezon mentve.", async () => {
    const id = optInt(formData, "id");
    const vals = [s(formData, "name"), date(formData, "startDate"), date(formData, "endDate"), int(formData, "nightlyRate"),
      optInt(formData, "weekendRate"), optInt(formData, "minNights"), optInt(formData, "priority") ?? 0];
    if (!vals[0]) throw new BookingError("validation", "Adjon nevet a szezonnak.");
    if ((vals[2] as string) < (vals[1] as string)) throw new BookingError("validation", "A szezon vége nem lehet a kezdete előtt.");
    if (id) await query("UPDATE seasons SET name=$2, start_date=$3, end_date=$4, nightly_rate=$5, weekend_rate=$6, min_nights=$7, priority=$8 WHERE id=$1", [id, ...vals]);
    else await query("INSERT INTO seasons (property_id, name, start_date, end_date, nightly_rate, weekend_rate, min_nights, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [await propertyId(), ...vals]);
    await audit(undefined, user.email, id ? "season.updated" : "season.created", "season", id, { name: vals[0] });
  });
}

export async function deleteSeasonAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Szezon törölve.", async () => {
    await query("DELETE FROM seasons WHERE id = $1", [int(formData, "id")]);
    await audit(undefined, user.email, "season.deleted", "season", s(formData, "id"));
  });
}

export async function upsertOverrideAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Egyedi nap mentve.", async () => {
    const rate = optInt(formData, "nightlyRate");
    const min = optInt(formData, "minNights");
    if (rate === null && min === null) throw new BookingError("validation", "Adjon meg árat vagy minimum éjszakaszámot.");
    await query(
      `INSERT INTO rate_overrides (property_id, date, nightly_rate, min_nights, label, kind) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (property_id, date) DO UPDATE SET nightly_rate=EXCLUDED.nightly_rate, min_nights=EXCLUDED.min_nights, label=EXCLUDED.label, kind=EXCLUDED.kind`,
      [await propertyId(), date(formData, "date"), rate, min, s(formData, "label"), s(formData, "kind") === "holiday" ? "holiday" : "custom"],
    );
    await audit(undefined, user.email, "override.saved", "rate_override", s(formData, "date"));
  });
}

export async function deleteOverrideAction(formData: FormData) {
  await requireAdmin("owner");
  await run("/admin/arak", "Egyedi nap törölve.", async () => { await query("DELETE FROM rate_overrides WHERE id = $1", [int(formData, "id")]); });
}

export async function upsertFeeAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Költségtétel mentve.", async () => {
    const id = optInt(formData, "id");
    const kind = z.enum(["per_stay", "per_night", "per_guest_night"]).parse(s(formData, "kind"));
    const vals = [s(formData, "name"), kind, int(formData, "amount"), bool(formData, "active")];
    if (!vals[0]) throw new BookingError("validation", "Adjon nevet a tételnek.");
    if (id) await query("UPDATE fees SET name=$2, kind=$3, amount=$4, active=$5 WHERE id=$1", [id, ...vals]);
    else await query("INSERT INTO fees (property_id, name, kind, amount, active, sort) VALUES ($1,$2,$3,$4,$5, 10)", [await propertyId(), ...vals]);
    await audit(undefined, user.email, "fee.saved", "fee", id, { name: vals[0] });
  });
}

export async function deleteFeeAction(formData: FormData) {
  await requireAdmin("owner");
  await run("/admin/arak", "Költségtétel törölve.", async () => { await query("DELETE FROM fees WHERE id = $1", [int(formData, "id")]); });
}

export async function upsertCouponAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/arak", "Kupon mentve.", async () => {
    const id = optInt(formData, "id");
    const code = s(formData, "code").toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new BookingError("validation", "A kuponkód 3–40 karakter: betű, szám, - vagy _.");
    const kind = z.enum(["percent", "fixed"]).parse(s(formData, "kind"));
    const value = int(formData, "value");
    if (value <= 0 || (kind === "percent" && value > 100)) throw new BookingError("validation", "Érvénytelen kedvezmény mértéke.");
    const vals = [code, kind, value, optDate(formData, "validFrom"), optDate(formData, "validTo"), optInt(formData, "minNights"), optInt(formData, "maxUses"), bool(formData, "active")];
    try {
      if (id) await query("UPDATE coupons SET code=$2, kind=$3, value=$4, valid_from=$5, valid_to=$6, min_nights=$7, max_uses=$8, active=$9 WHERE id=$1", [id, ...vals]);
      else await query("INSERT INTO coupons (property_id, code, kind, value, valid_from, valid_to, min_nights, max_uses, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [await propertyId(), ...vals]);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") throw new BookingError("validation", "Ez a kuponkód már létezik.");
      throw err;
    }
    await audit(undefined, user.email, "coupon.saved", "coupon", id, { code });
  });
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin("owner");
  await run("/admin/arak", "Kupon törölve vagy inaktiválva.", async () => {
    const id = int(formData, "id");
    const used = await queryOne("SELECT 1 FROM bookings WHERE coupon_id = $1 LIMIT 1", [id]);
    if (used) await query("UPDATE coupons SET active = false WHERE id = $1", [id]);
    else await query("DELETE FROM coupons WHERE id = $1", [id]);
  });
}

// ——— szállásadatok és képek (tulajdonos) ———
export async function updateContentAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/szallas", "Tartalom mentve.", async () => {
    const p = await getProperty();
    if (!p) throw new BookingError("not_found", "Nincs szállás.");
    const amenities = lines(s(formData, "amenities")).reduce<{ group: string; items: string[] }[]>((acc, l) => {
      if (l.startsWith("#")) acc.push({ group: l.replace(/^#+\s*/, ""), items: [] });
      else if (acc.length) acc[acc.length - 1].items.push(l.replace(/^[-•]\s*/, ""));
      return acc;
    }, []);
    const pairs = (v: string, sepRe = /\s*[|:]\s*/) =>
      lines(v).map((l) => {
        const [a, ...rest] = l.split(sepRe);
        return [a, rest.join(" ")] as const;
      });
    const content = {
      ...p.content,
      tagline: s(formData, "tagline"), intro: s(formData, "intro"), story: s(formData, "story"),
      highlights: lines(s(formData, "highlights")), amenities,
      surroundings: s(formData, "surroundings"),
      distances: pairs(s(formData, "distances")).map(([label, value]) => ({ label, value })),
      guestInfo: pairs(s(formData, "guestInfo"), /\s*\|\s*/).map(([title, text]) => ({ title, text })),
      houseRules: s(formData, "houseRules"), cancellationText: s(formData, "cancellationText"),
      privacyPolicy: s(formData, "privacyPolicy"), terms: s(formData, "terms"),
      contactEmail: s(formData, "contactEmail"), contactPhone: s(formData, "contactPhone"), address: s(formData, "address"),
      ntakNumber: s(formData, "ntakNumber"), bankTransferInfo: s(formData, "bankTransferInfo"),
    };
    await query("UPDATE properties SET name = $2, content = $3, updated_at = now() WHERE id = $1", [p.id, s(formData, "name") || p.name, JSON.stringify(content)]);
    await audit(undefined, user.email, "content.updated", "property", p.id);
  });
}

const MAX_UPLOAD = 15 * 1024 * 1024;

export async function uploadMediaAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/szallas#kepek", "Kép(ek) feltöltve.", async () => {
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new BookingError("validation", "Válasszon ki legalább egy képet.");
    const pid = await propertyId();
    for (const file of files) {
      if (file.size > MAX_UPLOAD) throw new BookingError("validation", `${file.name}: legfeljebb 15 MB lehet.`);
      if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) throw new BookingError("validation", `${file.name}: nem támogatott képformátum.`);
      const input = Buffer.from(await file.arrayBuffer());
      // EXIF-forgatás alkalmazása, metaadatok (pl. GPS) eltávolítása, WebP-be konvertálás két méretben
      const large = await sharp(input).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      const thumb = await sharp(input).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      await query(
        `INSERT INTO media (property_id, mime, width, height, data, thumb, alt, sort)
         VALUES ($1, 'image/webp', $2, $3, $4, $5, $6, (SELECT coalesce(max(sort), 0) + 1 FROM media WHERE property_id = $1))`,
        [pid, large.info.width, large.info.height, large.data, thumb, s(formData, "alt") || "[PLACEHOLDER: képleírás]"],
      );
    }
    await audit(undefined, user.email, "media.uploaded", "media", null, { count: files.length });
  });
}

export async function updateMediaAction(formData: FormData) {
  await requireAdmin("owner");
  await run("/admin/szallas#kepek", "Kép mentve.", async () => {
    const id = s(formData, "id");
    await withTransaction(async (db) => {
      if (bool(formData, "isCover")) await query("UPDATE media SET is_cover = false WHERE property_id = (SELECT property_id FROM media WHERE id = $1)", [id], db);
      await query("UPDATE media SET alt = $2, caption = $3, sort = $4, is_cover = $5 WHERE id = $1",
        [id, s(formData, "alt"), s(formData, "caption"), optInt(formData, "sort") ?? 0, bool(formData, "isCover")], db);
    });
  });
}

export async function deleteMediaAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/szallas#kepek", "Kép törölve.", async () => {
    await query("DELETE FROM media WHERE id = $1", [s(formData, "id")]);
    await audit(undefined, user.email, "media.deleted", "media", s(formData, "id"));
  });
}

// ——— naptárszinkron ———
export async function addFeedAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/szinkron", "Naptár hozzáadva.", async () => {
    const url = s(formData, "url");
    if (!/^https:\/\/\S+$/i.test(url)) throw new BookingError("validation", "Csak https:// kezdetű naptár-URL adható meg.");
    await query("INSERT INTO ical_feeds (property_id, name, url) VALUES ($1, $2, $3)", [await propertyId(), s(formData, "name") || "Külső naptár", url]);
    await audit(undefined, user.email, "ical.feed_added", "ical_feed", null, { name: s(formData, "name") });
  });
}

export async function deleteFeedAction(formData: FormData) {
  const user = await requireAdmin("owner");
  await run("/admin/szinkron", "Naptár és importált zárolásai törölve.", async () => {
    await query("DELETE FROM ical_feeds WHERE id = $1", [int(formData, "id")]);
    await audit(undefined, user.email, "ical.feed_deleted", "ical_feed", s(formData, "id"));
  });
}

export async function syncFeedAction(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id");
  let target = "/admin/szinkron";
  const res = await syncFeed(id);
  target = withMsg(target, res.error ? "err" : "msg", res.error ? `Szinkron hiba: ${res.error}` : `Szinkron kész: ${res.imported} esemény${res.conflicts.length ? `, ÜTKÖZÉS: ${res.conflicts.join(", ")}` : ""}.`);
  revalidatePath("/admin", "layout");
  redirect(target);
}

// ——— e-mailek ———
export async function retryEmailsAction() {
  await requireAdmin();
  await run("/admin/emailek", "Kézbesítés lefuttatva.", async () => {
    await query("UPDATE email_outbox SET status = 'queued', attempts = 0 WHERE status = 'failed'");
    await deliverOutbox(50);
  });
}
