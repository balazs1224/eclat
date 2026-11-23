"use client";
import { useMemo, useState } from "react";
import { addDays, isoWeekday } from "@/lib/dates";

export interface CalendarProps {
  occupied: Set<string>;
  minNights: Record<string, number>;
  defaultMinNights: number;
  firstBookable: string;
  lastBookable: string;
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  labels: { prev: string; next: string; booked: string };
}

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const monthFmt = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" });

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}
function addMonths(first: string, n: number) {
  const [y, m] = first.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** Az érkezéstől számított első foglalt éjszaka — ez a legkésőbbi lehetséges távozási nap. */
export function maxCheckoutFor(checkIn: string, occupied: Set<string>, lastBookable: string): string {
  let d = addDays(checkIn, 1);
  const hardStop = addDays(lastBookable, 60);
  while (d < hardStop && !occupied.has(d)) d = addDays(d, 1);
  return d;
}

export function Calendar({ occupied, minNights, defaultMinNights, firstBookable, lastBookable, checkIn, checkOut, onChange, labels }: CalendarProps) {
  const [offset, setOffset] = useState(0);
  const base = monthStart(checkIn ?? firstBookable);
  const [anchor] = useState(base);
  const months = [addMonths(anchor, offset), addMonths(anchor, offset + 1)];
  const minMonth = monthStart(firstBookable);
  const maxMonth = monthStart(lastBookable);

  const selectingCheckout = !!checkIn && !checkOut;
  const maxCheckout = useMemo(() => (checkIn ? maxCheckoutFor(checkIn, occupied, lastBookable) : null), [checkIn, occupied, lastBookable]);
  const minCheckout = checkIn ? addDays(checkIn, minNights[checkIn] ?? defaultMinNights) : null;

  const canCheckIn = (d: string) => d >= firstBookable && d <= lastBookable && !occupied.has(d);
  const canCheckOut = (d: string) => !!checkIn && !!maxCheckout && !!minCheckout && d >= minCheckout && d <= maxCheckout;

  function select(d: string) {
    if (selectingCheckout && checkIn) {
      if (canCheckOut(d)) return onChange(checkIn, d);
      if (d <= checkIn && canCheckIn(d)) return onChange(d, null);
      if (canCheckIn(d)) return onChange(d, null);
      return;
    }
    if (canCheckIn(d)) onChange(d, null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const date = target.dataset.date;
    if (!date) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(date, step);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-date="${next}"]`);
    if (el) el.focus();
    else if (step > 0 && monthStart(next) <= maxMonth) setOffset((o) => o + 1);
    else if (step < 0 && monthStart(next) >= minMonth) setOffset((o) => o - 1);
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          disabled={months[0] <= minMonth}
          className="flex h-11 w-11 items-center justify-center border border-line transition-colors hover:border-ink disabled:opacity-30"
          aria-label={labels.prev}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          disabled={months[0] >= maxMonth}
          className="flex h-11 w-11 items-center justify-center border border-line transition-colors hover:border-ink disabled:opacity-30"
          aria-label={labels.next}
        >
          →
        </button>
      </div>
      <div className="grid gap-10 md:grid-cols-2">
        {months.map((m, idx) => (
          <Month
            key={m}
            first={m}
            className={idx === 1 ? "hidden md:block" : ""}
            render={(d) => {
              const inMonth = d.slice(0, 7) === m.slice(0, 7);
              if (!inMonth) return <span key={d} aria-hidden />;
              const isOcc = occupied.has(d);
              const outOfRange = d < firstBookable || d > lastBookable;
              const isStart = d === checkIn;
              const isEnd = d === checkOut;
              const inRange = !!checkIn && !!checkOut && d > checkIn && d < checkOut;
              const enabled = selectingCheckout ? canCheckOut(d) || canCheckIn(d) : canCheckIn(d);
              const checkoutOnly = selectingCheckout && isOcc && canCheckOut(d);
              const tooShort = selectingCheckout && checkIn && minCheckout && d > checkIn && d < minCheckout && !isOcc;
              const state = isOcc ? `, ${labels.booked}` : "";
              return (
                <button
                  key={d}
                  type="button"
                  data-date={d}
                  disabled={!enabled}
                  aria-pressed={isStart || isEnd}
                  aria-label={`${dayFmt.format(new Date(`${d}T00:00:00Z`))}${state}${isStart ? ", érkezés" : ""}${isEnd ? ", távozás" : ""}`}
                  onClick={() => select(d)}
                  className={[
                    "relative flex aspect-square min-h-10 items-center justify-center text-[0.95rem] transition-colors duration-300",
                    isStart || isEnd ? "bg-ink text-ivory" : inRange ? "bg-sand/70" : "",
                    !isStart && !isEnd && enabled ? "hover:bg-ivory-deep" : "",
                    isOcc && !checkoutOnly ? "text-muted/60 line-through decoration-gold/60" : "",
                    outOfRange && !isOcc ? "text-muted/35" : "",
                    tooShort ? "text-muted/50" : "",
                  ].join(" ")}
                >
                  {Number(d.slice(8))}
                </button>
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Month({ first, render, className = "" }: { first: string; render: (d: string) => React.ReactNode; className?: string }) {
  const lead = isoWeekday(first) - 1;
  const start = addDays(first, -lead);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const lastRowNeeded = days.slice(35).some((d) => d.slice(0, 7) === first.slice(0, 7));
  return (
    <div className={className}>
      <p className="display mb-4 text-center text-2xl capitalize">{monthFmt.format(new Date(`${first}T00:00:00Z`))}</p>
      <div role="group" aria-label={monthFmt.format(new Date(`${first}T00:00:00Z`))} className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} aria-hidden className="pb-2 text-[0.66rem] uppercase tracking-[0.14em] text-muted">{w}</span>
        ))}
        {(lastRowNeeded ? days : days.slice(0, 35)).map((d) => render(d))}
      </div>
    </div>
  );
}
