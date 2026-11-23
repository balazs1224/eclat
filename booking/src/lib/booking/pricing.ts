// Árazási motor — tiszta függvény, adatbázis nélkül tesztelhető.
// Szabályok:
//  • Éjszakadíj elsőbbsége: egyedi napidíj (rate_override) > szezon (legmagasabb prioritás) > alapár.
//  • Hétvégi éjszaka (alapból péntek, szombat): a szezon hétvégi ára, ha meg van adva.
//  • Minimum éjszakaszám az érkezés napjára érvényes szabály szerint: egyedi nap > szezon > alapérték.
//  • Pótágy / extra vendég díj: base_guests feletti vendégenként és éjszakánként.
//  • Kupon csak a szállásdíjra (éjszakák + extra vendég) vonatkozik, a további költségekre nem.
//  • Előleg: payment_mode = 'deposit' esetén total * deposit_percent %, kivéve ha az érkezés
//    balance_due_days napon belül van — akkor a teljes összeg esedékes.
import { addDays, diffDays, eachDay, isIsoDate, isoWeekday } from "../dates";

export interface PricingProperty {
  baseNightlyRate: number;
  baseGuests: number;
  maxGuests: number;
  extraGuestFee: number;
  defaultMinNights: number;
  weekendNights: number[];
  minAdvanceDays: number;
  maxAdvanceDays: number;
  paymentMode: "deposit" | "full";
  depositPercent: number;
  balanceDueDays: number;
}

export interface Season {
  id?: number;
  name: string;
  startDate: string; // beleértve
  endDate: string; // beleértve
  nightlyRate: number;
  weekendRate: number | null;
  minNights: number | null;
  priority: number;
}

export interface RateOverride {
  date: string;
  nightlyRate: number | null;
  minNights: number | null;
  label: string;
}

export interface Fee {
  name: string;
  kind: "per_stay" | "per_night" | "per_guest_night";
  amount: number;
}

export interface Coupon {
  id?: number;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  validFrom: string | null;
  validTo: string | null;
  minNights: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export interface PricingContext {
  property: PricingProperty;
  seasons: Season[];
  overrides: RateOverride[];
  fees: Fee[];
  today: string;
}

export interface QuoteRequest {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  couponCode?: string | null;
}

export interface NightPrice {
  date: string;
  rate: number;
  source: "override" | "season" | "base";
  label: string;
  weekend: boolean;
}

export interface Quote {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  nightly: NightPrice[];
  accommodation: number;
  extraGuests: { count: number; perNight: number; amount: number };
  fees: { name: string; amount: number }[];
  discount: { code: string; amount: number } | null;
  couponError: string | null;
  total: number;
  deposit: number;
  balance: number;
  balanceDueDate: string | null;
  minNights: number;
}

export type QuoteError =
  | "invalid_dates"
  | "checkout_before_checkin"
  | "too_soon"
  | "too_far"
  | "min_nights"
  | "too_many_guests"
  | "invalid_guests";

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: QuoteError; message: string; minNights?: number };

const MESSAGES: Record<QuoteError, string> = {
  invalid_dates: "Érvénytelen dátum.",
  checkout_before_checkin: "A távozás napja az érkezés utáni nap legyen.",
  too_soon: "Erre az érkezési napra már nem lehet online foglalni.",
  too_far: "Ilyen távoli időpontra még nem nyitottuk meg a foglalást.",
  min_nights: "A választott időszakra hosszabb minimum tartózkodás érvényes.",
  too_many_guests: "A vendégek száma meghaladja a szállás befogadóképességét.",
  invalid_guests: "Legalább egy felnőtt vendég szükséges.",
};

function fail(error: QuoteError, extra: Partial<{ minNights: number }> = {}): QuoteResult {
  return { ok: false, error, message: MESSAGES[error], ...extra };
}

export function seasonFor(date: string, seasons: Season[]): Season | null {
  let best: Season | null = null;
  for (const s of seasons) {
    if (date < s.startDate || date > s.endDate) continue;
    if (!best || s.priority > best.priority || (s.priority === best.priority && s.startDate > best.startDate)) best = s;
  }
  return best;
}

export function minNightsFor(checkIn: string, ctx: Pick<PricingContext, "property" | "seasons" | "overrides">): number {
  const ov = ctx.overrides.find((o) => o.date === checkIn);
  if (ov?.minNights) return ov.minNights;
  const season = seasonFor(checkIn, ctx.seasons);
  if (season?.minNights) return season.minNights;
  return ctx.property.defaultMinNights;
}

export function nightPrice(date: string, ctx: Pick<PricingContext, "property" | "seasons" | "overrides">): NightPrice {
  const weekend = ctx.property.weekendNights.includes(isoWeekday(date));
  const ov = ctx.overrides.find((o) => o.date === date);
  if (ov && ov.nightlyRate !== null) return { date, rate: ov.nightlyRate, source: "override", label: ov.label, weekend };
  const season = seasonFor(date, ctx.seasons);
  if (season) {
    const rate = weekend && season.weekendRate !== null ? season.weekendRate : season.nightlyRate;
    return { date, rate, source: "season", label: season.name, weekend };
  }
  return { date, rate: ctx.property.baseNightlyRate, source: "base", label: "Alapár", weekend };
}

/** Kupon érvényessége; null = érvényes, egyébként hibaüzenet */
export function couponProblem(coupon: Coupon | null, checkIn: string, nights: number): string | null {
  if (!coupon || !coupon.active) return "Ismeretlen vagy inaktív kuponkód.";
  if (coupon.validFrom && checkIn < coupon.validFrom) return "A kupon erre az időszakra nem érvényes.";
  if (coupon.validTo && checkIn > coupon.validTo) return "A kupon erre az időszakra nem érvényes.";
  if (coupon.minNights && nights < coupon.minNights) return `A kupon legalább ${coupon.minNights} éjszakás foglalásra érvényes.`;
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return "A kupont már felhasználták.";
  return null;
}

export interface QuoteOptions {
  /** Admin felületen: minimum éjszakaszám és foglalási előidő szabályai nem kötelezőek. */
  ignoreBookingRules?: boolean;
}

export function calculateQuote(
  ctx: PricingContext,
  req: QuoteRequest,
  coupon: Coupon | null = null,
  opts: QuoteOptions = {},
): QuoteResult {
  const { property } = ctx;
  if (!isIsoDate(req.checkIn) || !isIsoDate(req.checkOut)) return fail("invalid_dates");
  if (req.checkOut <= req.checkIn) return fail("checkout_before_checkin");
  if (!Number.isInteger(req.adults) || !Number.isInteger(req.children) || req.adults < 1 || req.children < 0)
    return fail("invalid_guests");

  const guests = req.adults + req.children;
  if (guests > property.maxGuests) return fail("too_many_guests");

  const lead = diffDays(ctx.today, req.checkIn);
  if (!opts.ignoreBookingRules) {
    if (lead < property.minAdvanceDays) return fail("too_soon");
    if (lead > property.maxAdvanceDays) return fail("too_far");
  }

  const nights = diffDays(req.checkIn, req.checkOut);
  const minNights = minNightsFor(req.checkIn, ctx);
  if (!opts.ignoreBookingRules && nights < minNights) return fail("min_nights", { minNights });

  const nightly = eachDay(req.checkIn, req.checkOut).map((d) => nightPrice(d, ctx));
  const nightsSum = nightly.reduce((s, n) => s + n.rate, 0);

  const extraCount = Math.max(0, guests - property.baseGuests);
  const extraAmount = extraCount * property.extraGuestFee * nights;
  const accommodation = nightsSum + extraAmount;

  const fees = ctx.fees.map((f) => {
    const amount = f.kind === "per_stay" ? f.amount : f.kind === "per_night" ? f.amount * nights : f.amount * nights * guests;
    return { name: f.name, amount };
  });
  const feesSum = fees.reduce((s, f) => s + f.amount, 0);

  let discount: Quote["discount"] = null;
  let couponError: string | null = null;
  if (req.couponCode && req.couponCode.trim()) {
    couponError = couponProblem(coupon, req.checkIn, nights);
    if (!couponError && coupon) {
      const raw = coupon.kind === "percent" ? Math.round((accommodation * coupon.value) / 100) : coupon.value;
      discount = { code: coupon.code.toUpperCase(), amount: Math.min(raw, accommodation) };
    }
  }

  const total = accommodation + feesSum - (discount?.amount ?? 0);

  let deposit = total;
  let balanceDueDate: string | null = null;
  if (property.paymentMode === "deposit" && lead > property.balanceDueDays) {
    deposit = Math.round((total * property.depositPercent) / 100);
    balanceDueDate = addDays(req.checkIn, -property.balanceDueDays);
  }

  return {
    ok: true,
    quote: {
      checkIn: req.checkIn,
      checkOut: req.checkOut,
      nights,
      guests,
      nightly,
      accommodation: nightsSum,
      extraGuests: { count: extraCount, perNight: property.extraGuestFee, amount: extraAmount },
      fees,
      discount,
      couponError,
      total,
      deposit,
      balance: total - deposit,
      balanceDueDate,
      minNights,
    },
  };
}

/** Lemondáskor visszajáró összeg a szabályok alapján (a már befizetett összegből). */
export function refundFor(
  rules: { daysBefore: number; refundPercent: number }[],
  checkIn: string,
  cancelDate: string,
  amountPaid: number,
): { percent: number; amount: number } {
  const daysBefore = diffDays(cancelDate, checkIn);
  const sorted = [...rules].sort((a, b) => b.daysBefore - a.daysBefore);
  const rule = sorted.find((r) => daysBefore >= r.daysBefore);
  const percent = rule ? rule.refundPercent : 0;
  return { percent, amount: Math.round((amountPaid * percent) / 100) };
}
