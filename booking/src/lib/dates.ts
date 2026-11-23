// Tiszta naptári-dátum műveletek 'YYYY-MM-DD' formátumon, UTC-ben számolva (nincs időzóna-csúszás).
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toUtc(s: string): number {
  return Date.parse(`${s}T00:00:00Z`);
}

export function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return fromUtc(toUtc(s) + n * DAY);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY);
}

/** ISO hét-nap: 1 = hétfő … 7 = vasárnap */
export function isoWeekday(s: string): number {
  const d = new Date(toUtc(s)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Az [from, to) tartomány minden napja */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** A mai nap a szállás időzónájában (alapból Europe/Budapest) */
export function todayIn(timeZone = "Europe/Budapest", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
