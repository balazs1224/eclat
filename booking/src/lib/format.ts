const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export function formatHuf(amount: number): string {
  return huf.format(amount);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }): string {
  return new Intl.DateTimeFormat("hu-HU", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Budapest" }).format(new Date(d));
}

export const STATUS_LABELS: Record<string, string> = {
  hold: "Zárolva (űrlap kitöltése alatt)",
  pending: "Függőben",
  confirmed: "Visszaigazolt",
  paid: "Fizetett",
  cancelled: "Lemondott",
  expired: "Lejárt zárolás",
};
