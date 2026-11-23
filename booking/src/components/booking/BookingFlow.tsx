"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar } from "./Calendar";
import { hu } from "@/i18n/hu";
import { formatDate, formatHuf } from "@/lib/format";
import type { Quote } from "@/lib/booking/pricing";

interface Availability {
  occupied: string[];
  minNights: Record<string, number>;
  defaultMinNights: number;
  firstBookable: string;
  lastBookable: string;
  maxGuests: number;
}

interface Hold {
  bookingId: string;
  holdToken: string;
  holdExpiresAt: string;
  quote: Quote;
}

const t = hu.booking;

async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; status: number; data: T & { message?: string; error?: string } }> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function BookingFlow({ bookingMode, holdMinutes }: { bookingMode: "request" | "instant"; holdMinutes: number }) {
  const router = useRouter();
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availError, setAvailError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [hold, setHold] = useState<Hold | null>(null);
  const [step, setStep] = useState<"dates" | "details">("dates");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const detailsHeading = useRef<HTMLHeadingElement>(null);

  const loadAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/availability", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAvail(data);
      setAvailError(null);
    } catch {
      setAvailError("A naptár betöltése nem sikerült. Kérjük, frissítse az oldalt.");
    }
  }, []);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);
  const occupied = useMemo(() => new Set(avail?.occupied ?? []), [avail]);

  // Árajánlat frissítése a kiválasztás változásakor
  useEffect(() => {
    if (!checkIn || !checkOut) { setQuote(null); setQuoteError(null); return; }
    const ctrl = new AbortController();
    setLoadingQuote(true);
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn, checkOut, adults, children, couponCode: coupon || null }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setQuote(null); setQuoteError(data.message ?? "Hiba történt."); return; }
        setQuote(data.quote);
        setQuoteError(data.available === false ? "A kiválasztott időszak időközben foglalttá vált." : null);
      })
      .catch(() => {})
      .finally(() => setLoadingQuote(false));
    return () => ctrl.abort();
  }, [checkIn, checkOut, adults, children, coupon]);

  // Zárolás visszaszámláló
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const ms = new Date(hold.holdExpiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0) {
        setHold(null);
        setStep("dates");
        setFormError("A zárolás ideje lejárt — kérjük, ellenőrizze újra az időpontot.");
        loadAvailability();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hold, loadAvailability]);

  async function startHold() {
    if (!checkIn || !checkOut) return;
    setBusy(true);
    setFormError(null);
    const res = await postJson<Hold>("/api/holds", { checkIn, checkOut, adults, children, couponCode: coupon || null });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.data.message ?? "Hiba történt.");
      if (res.status === 409) { setCheckIn(null); setCheckOut(null); loadAvailability(); }
      return;
    }
    setHold(res.data);
    setStep("details");
    requestAnimationFrame(() => detailsHeading.current?.focus());
  }

  async function goBack() {
    if (hold) await postJson("/api/holds", { bookingId: hold.bookingId, holdToken: hold.holdToken }, "DELETE");
    setHold(null);
    setStep("dates");
    setFormError(null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hold) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setFormError(null);
    const res = await postJson<{ reference: string; accessToken: string }>("/api/bookings", {
      bookingId: hold.bookingId,
      holdToken: hold.holdToken,
      name: f.get("name"),
      email: f.get("email"),
      phone: f.get("phone"),
      country: f.get("country") || null,
      message: f.get("message") || null,
      privacy: f.get("privacy") === "on",
      terms: f.get("terms") === "on",
      website: f.get("website") || "",
    });
    if (!res.ok) {
      setBusy(false);
      setFormError(res.data.error === "validation" ? "Kérjük, ellenőrizze a kiemelt mezőket és fogadja el a feltételeket." : res.data.message ?? "Hiba történt.");
      return;
    }
    router.push(`/foglalas/${res.data.reference}?t=${encodeURIComponent(res.data.accessToken)}`);
  }

  const shownQuote = step === "details" && hold ? hold.quote : quote;
  const minNightsHint = checkIn && !checkOut && avail ? avail.minNights[checkIn] ?? avail.defaultMinNights : undefined;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        {step === "dates" ? (
          <section aria-labelledby="naptar-cim" id="naptar" className="scroll-mt-28">
            <h2 id="naptar-cim" className="eyebrow">1. Időpont és vendégek</h2>
            <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
              {!checkIn ? t.selectDates : !checkOut ? `${t.selectCheckout}${minNightsHint ? ` (${t.minNights(minNightsHint)})` : ""}` : `${formatDate(checkIn)} – ${formatDate(checkOut)}`}
            </p>
            <div className="mt-8">
              {availError && <p role="alert" className="text-danger">{availError}</p>}
              {!avail && !availError && <div className="h-80 animate-pulse bg-ivory-deep/70" aria-label="Naptár betöltése" />}
              {avail && (
                <Calendar
                  occupied={occupied}
                  minNights={avail.minNights}
                  defaultMinNights={avail.defaultMinNights}
                  firstBookable={avail.firstBookable}
                  lastBookable={avail.lastBookable}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={(a, b) => { setCheckIn(a); setCheckOut(b); setFormError(null); }}
                  labels={{ prev: t.prevMonth, next: t.nextMonth, booked: t.unavailable }}
                />
              )}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted">
                <span className="flex items-center gap-2"><span className="h-3 w-3 border border-line" />{t.legendFree}</span>
                <span className="flex items-center gap-2"><span className="text-muted/60 line-through decoration-gold/60">12</span>{t.legendBooked}</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 bg-ink" />{t.legendSelected}</span>
                {(checkIn || checkOut) && (
                  <button type="button" className="link-underline ml-auto" onClick={() => { setCheckIn(null); setCheckOut(null); }}>{t.reset}</button>
                )}
              </div>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              <Stepper label={t.adults} value={adults} min={1} max={Math.max(1, (avail?.maxGuests ?? 10) - children)} onChange={setAdults} />
              <Stepper label={t.children} value={children} min={0} max={Math.max(0, (avail?.maxGuests ?? 10) - adults)} onChange={setChildren} />
            </div>
            {avail && <p className="mt-3 text-xs text-muted">Legfeljebb {avail.maxGuests} vendég.</p>}

            <form
              className="mt-10 flex items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim()); }}
            >
              <label className="flex-1">
                <span className="field-label">{t.coupon}</span>
                <input className="field uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} maxLength={40} autoComplete="off" />
              </label>
              <button type="submit" className="btn btn-ghost">{t.apply}</button>
            </form>
          </section>
        ) : (
          <section aria-labelledby="adatok-cim">
            <h2 id="adatok-cim" ref={detailsHeading} tabIndex={-1} className="eyebrow outline-none">2. {t.detailsTitle}</h2>
            <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
              {t.holdNotice(String(holdMinutes))} <span className="tabular-nums text-gold-ink">({mm}:{ss})</span>
            </p>
            <form onSubmit={submit} className="mt-10 grid gap-8 sm:grid-cols-2" noValidate={false}>
              <label className="sm:col-span-2">
                <span className="field-label">{t.name} *</span>
                <input name="name" required minLength={2} maxLength={120} autoComplete="name" className="field" />
              </label>
              <label>
                <span className="field-label">{t.email} *</span>
                <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
              </label>
              <label>
                <span className="field-label">{t.phone} *</span>
                <input name="phone" type="tel" required minLength={6} maxLength={40} pattern={"[\\d+ \\(\\)\\/\\-]+"} autoComplete="tel" className="field" />
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">{t.country}</span>
                <input name="country" maxLength={60} autoComplete="country-name" className="field" defaultValue="Magyarország" />
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">{t.message}</span>
                <textarea name="message" rows={3} maxLength={2000} className="field resize-y" />
              </label>
              <label aria-hidden className="absolute -left-[9999px]">
                Weboldal <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <div className="space-y-4 text-sm sm:col-span-2">
                <label className="flex gap-3">
                  <input type="checkbox" name="privacy" required className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                  <span>{t.privacy} <Link href="/adatvedelem" target="_blank" className="underline">Megnyitás</Link></span>
                </label>
                <label className="flex gap-3">
                  <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                  <span>{t.terms} <Link href="/feltetelek" target="_blank" className="underline">Megnyitás</Link></span>
                </label>
              </div>
              <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={goBack} className="btn btn-ghost">{t.back}</button>
                <button type="submit" disabled={busy} className="btn btn-solid">
                  {busy ? "Küldés…" : bookingMode === "instant" ? t.submitInstant : t.submitRequest}
                </button>
              </div>
            </form>
          </section>
        )}
        {formError && <p role="alert" className="mt-6 border-l-2 border-danger pl-4 text-danger">{formError}</p>}
      </div>

      <aside aria-label="Foglalás összegzése" className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <div className="border border-line/80 bg-ivory p-6 sm:p-8">
            <p className="eyebrow">Összegzés</p>
            {!shownQuote ? (
              <p className="mt-5 text-sm text-ink-soft">{quoteError ?? (loadingQuote ? "Ár számítása…" : t.selectDates)}</p>
            ) : (
              <QuoteSummary q={shownQuote} />
            )}
            {quoteError && shownQuote && <p role="alert" className="mt-4 text-sm text-danger">{quoteError}</p>}
            {shownQuote?.couponError && <p className="mt-4 text-sm text-danger">{shownQuote.couponError}</p>}
            {step === "dates" && (
              <button
                type="button"
                onClick={startHold}
                disabled={!quote || !!quoteError || busy || loadingQuote}
                className="btn btn-solid mt-8 w-full"
              >
                {busy ? "Egy pillanat…" : t.continue}
              </button>
            )}
            <p className="mt-6 text-xs leading-relaxed text-muted">{bookingMode === "request" ? t.requestNote : "Online fizetés jelenleg nincs — a fizetés részleteit e-mailben küldjük."}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <span className="field-label" id={`st-${label}`}>{label}</span>
      <div className="mt-2 flex items-center justify-between border-b border-line" role="group" aria-labelledby={`st-${label}`}>
        <button type="button" className="h-12 w-12 text-xl disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label} csökkentése`}>−</button>
        <output className="display text-2xl tabular-nums" aria-live="polite">{value}</output>
        <button type="button" className="h-12 w-12 text-xl disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} növelése`}>+</button>
      </div>
    </div>
  );
}

function QuoteSummary({ q }: { q: Quote }) {
  // azonos díjú és címkéjű éjszakák csoportosítása
  const groups: { label: string; rate: number; n: number }[] = [];
  for (const n of q.nightly) {
    const g = groups.find((x) => x.rate === n.rate && x.label === n.label);
    if (g) g.n++;
    else groups.push({ label: n.label, rate: n.rate, n: 1 });
  }
  return (
    <div className="mt-5">
      <p className="display text-2xl">{formatDate(q.checkIn, { month: "short", day: "numeric" })} – {formatDate(q.checkOut, { month: "short", day: "numeric", year: "numeric" })}</p>
      <p className="text-sm text-muted">{t.nights(q.nights)} · {q.guests} vendég</p>
      <dl className="mt-6 space-y-2.5 text-sm">
        {groups.map((g) => (
          <div key={`${g.label}-${g.rate}`} className="flex justify-between gap-4">
            <dt className="text-ink-soft">{g.n} × {formatHuf(g.rate)} <span className="text-muted">· {g.label}</span></dt>
            <dd className="tabular-nums">{formatHuf(g.n * g.rate)}</dd>
          </div>
        ))}
        {q.extraGuests.amount > 0 && (
          <div className="flex justify-between gap-4"><dt className="text-ink-soft">{t.extraGuests} ({q.extraGuests.count} fő)</dt><dd className="tabular-nums">{formatHuf(q.extraGuests.amount)}</dd></div>
        )}
        {q.fees.map((f) => (
          <div key={f.name} className="flex justify-between gap-4"><dt className="text-ink-soft">{f.name}</dt><dd className="tabular-nums">{formatHuf(f.amount)}</dd></div>
        ))}
        {q.discount && (
          <div className="flex justify-between gap-4 text-success"><dt>{t.discount} ({q.discount.code})</dt><dd className="tabular-nums">−{formatHuf(q.discount.amount)}</dd></div>
        )}
        <div className="hairline my-4" />
        <div className="flex items-baseline justify-between gap-4">
          <dt className="eyebrow">{t.total}</dt>
          <dd className="display text-3xl tabular-nums">{formatHuf(q.total)}</dd>
        </div>
        {q.deposit < q.total && (
          <>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">{t.deposit}</dt><dd className="tabular-nums">{formatHuf(q.deposit)}</dd></div>
            {q.balanceDueDate && (
              <div className="flex justify-between gap-4 text-muted"><dt>{t.balance}, {t.balanceDue} {formatDate(q.balanceDueDate, { month: "long", day: "numeric" })}</dt><dd className="tabular-nums">{formatHuf(q.balance)}</dd></div>
            )}
          </>
        )}
      </dl>
    </div>
  );
}
