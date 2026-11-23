import { query, queryOne, type Db } from "./db";
import type { Fee, PricingContext, PricingProperty, RateOverride, Season } from "./booking/pricing";
import { todayIn } from "./dates";

export interface PropertyContent {
  tagline: string;
  intro: string;
  story: string;
  highlights: string[];
  amenities: { group: string; items: string[] }[];
  surroundings: string;
  distances: { label: string; value: string }[];
  guestInfo: { title: string; text: string }[];
  houseRules: string;
  cancellationText: string;
  privacyPolicy: string;
  terms: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  ntakNumber: string;
  bankTransferInfo: string;
}

export interface PropertyRow {
  id: number;
  slug: string;
  name: string;
  max_guests: number;
  base_guests: number;
  extra_guest_fee: number;
  base_nightly_rate: number;
  default_min_nights: number;
  weekend_nights: number[];
  min_advance_days: number;
  max_advance_days: number;
  booking_mode: "request" | "instant";
  payment_mode: "deposit" | "full";
  deposit_percent: number;
  balance_due_days: number;
  cancellation_rules: { daysBefore: number; refundPercent: number }[];
  check_in_time: string;
  check_out_time: string;
  content: PropertyContent;
  ical_export_token: string;
  timezone: string;
  currency: string;
}

export const DEFAULT_SLUG = "balatonboglar";

export async function getProperty(slug = DEFAULT_SLUG, db?: Db): Promise<PropertyRow | null> {
  return queryOne<PropertyRow>("SELECT * FROM properties WHERE slug = $1", [slug], db);
}

export async function getPropertyById(id: number, db?: Db, forUpdate = false): Promise<PropertyRow | null> {
  return queryOne<PropertyRow>(`SELECT * FROM properties WHERE id = $1 ${forUpdate ? "FOR UPDATE" : ""}`, [id], db);
}

export function toPricingProperty(p: PropertyRow): PricingProperty {
  return {
    baseNightlyRate: p.base_nightly_rate,
    baseGuests: p.base_guests,
    maxGuests: p.max_guests,
    extraGuestFee: p.extra_guest_fee,
    defaultMinNights: p.default_min_nights,
    weekendNights: p.weekend_nights,
    minAdvanceDays: p.min_advance_days,
    maxAdvanceDays: p.max_advance_days,
    paymentMode: p.payment_mode,
    depositPercent: p.deposit_percent,
    balanceDueDays: p.balance_due_days,
  };
}

export async function loadSeasons(propertyId: number, db?: Db): Promise<Season[]> {
  const rows = await query<{
    id: number; name: string; start_date: string; end_date: string; nightly_rate: number;
    weekend_rate: number | null; min_nights: number | null; priority: number;
  }>("SELECT * FROM seasons WHERE property_id = $1 ORDER BY start_date", [propertyId], db);
  return rows.map((r) => ({
    id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, nightlyRate: r.nightly_rate,
    weekendRate: r.weekend_rate, minNights: r.min_nights, priority: r.priority,
  }));
}

export async function loadOverrides(propertyId: number, from: string, to: string, db?: Db): Promise<RateOverride[]> {
  const rows = await query<{ date: string; nightly_rate: number | null; min_nights: number | null; label: string }>(
    "SELECT date, nightly_rate, min_nights, label FROM rate_overrides WHERE property_id = $1 AND date >= $2 AND date < $3",
    [propertyId, from, to],
    db,
  );
  return rows.map((r) => ({ date: r.date, nightlyRate: r.nightly_rate, minNights: r.min_nights, label: r.label }));
}

export async function loadFees(propertyId: number, db?: Db): Promise<Fee[]> {
  return query<Fee>(
    "SELECT name, kind, amount FROM fees WHERE property_id = $1 AND active ORDER BY sort, id",
    [propertyId],
    db,
  );
}

export async function loadPricingContext(property: PropertyRow, from: string, to: string, db?: Db, today?: string): Promise<PricingContext> {
  // egy tranzakciós kliensen a lekérdezések sorban futnak (pg nem engedi a párhuzamos query-t egy kliensen)
  const seasons = await loadSeasons(property.id, db);
  const overrides = await loadOverrides(property.id, from, to, db);
  const fees = await loadFees(property.id, db);
  return {
    property: toPricingProperty(property),
    seasons,
    overrides,
    fees,
    today: today ?? todayIn(property.timezone),
  };
}
