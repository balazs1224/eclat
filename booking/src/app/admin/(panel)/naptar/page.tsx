import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { addDays, eachDay, isoWeekday, todayIn } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { Field, Notice, PageTitle, Panel, Submit } from "@/components/admin/ui";
import { createBlockAction, deleteBlockAction } from "../../actions";

const monthFmt = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" });

function shiftMonth(first: string, n: number) {
  const [y, m] = first.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const property = (await getProperty())!;
  const today = todayIn();
  const first = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? `${sp.m}-01` : `${today.slice(0, 7)}-01`;
  const next = shiftMonth(first, 1);
  const gridStart = addDays(first, -(isoWeekday(first) - 1));
  const gridEnd = addDays(next, (8 - isoWeekday(next)) % 7);

  const bookings = await query<{ id: string; reference: string; guest_name: string | null; check_in: string; check_out: string; status: string }>(
    `SELECT id, reference, guest_name, check_in, check_out, status FROM bookings
     WHERE property_id = $1 AND status IN ('hold','pending','confirmed','paid') AND stay && daterange($2::date, $3::date, '[)')`,
    [property.id, gridStart, gridEnd],
  );
  const blocks = await query<{ id: number; check_in: string; check_out: string; reason: string; source: string }>(
    "SELECT id, check_in, check_out, reason, source FROM blocks WHERE property_id = $1 AND stay && daterange($2::date, $3::date, '[)') ORDER BY check_in",
    [property.id, gridStart, gridEnd],
  );
  const upcomingBlocks = await query<{ id: number; check_in: string; check_out: string; reason: string; source: string }>(
    "SELECT id, check_in, check_out, reason, source FROM blocks WHERE property_id = $1 AND check_out >= $2 ORDER BY check_in LIMIT 50",
    [property.id, today],
  );

  const days = eachDay(gridStart, gridEnd);
  const color: Record<string, string> = {
    pending: "bg-gold/25 text-gold-ink", confirmed: "bg-lake/20 text-ink", paid: "bg-success/20 text-ink", hold: "bg-line/60 text-muted",
  };

  return (
    <>
      <PageTitle eyebrow="Naptár" title={monthFmt.format(new Date(`${first}T00:00:00Z`))}>
        <Link href={`/admin/naptar?m=${shiftMonth(first, -1).slice(0, 7)}`} className="btn btn-ghost" aria-label="Előző hónap">←</Link>
        <Link href="/admin/naptar" className="btn btn-ghost">Ma</Link>
        <Link href={`/admin/naptar?m=${next.slice(0, 7)}`} className="btn btn-ghost" aria-label="Következő hónap">→</Link>
      </PageTitle>
      <Notice msg={sp.msg} err={sp.err} />

      <div className="overflow-x-auto">
        <div className="grid min-w-[44rem] grid-cols-7 border-t border-l border-line text-xs">
          {["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"].map((w) => (
            <div key={w} className="border-r border-b border-line px-2 py-2 uppercase tracking-[0.12em] text-muted">{w}</div>
          ))}
          {days.map((d) => {
            const inMonth = d >= first && d < next;
            const items = [
              ...bookings.filter((b) => b.check_in <= d && d < b.check_out).map((b) => (
                <Link key={b.id} href={`/admin/foglalasok/${b.id}`} className={`block truncate px-1.5 py-0.5 ${color[b.status]}`} title={b.reference}>
                  {d === b.check_in ? "▸ " : ""}{b.guest_name ?? b.reference}
                </Link>
              )),
              ...blocks.filter((k) => k.check_in <= d && d < k.check_out).map((k) => (
                <span key={`k${k.id}`} className="block truncate bg-ink/80 px-1.5 py-0.5 text-ivory" title={k.reason}>
                  {k.source === "ical" ? "⇄ " : "✕ "}{k.reason || "Zárolva"}
                </span>
              )),
            ];
            return (
              <div key={d} className={`min-h-24 space-y-1 border-r border-b border-line p-1.5 ${inMonth ? "" : "bg-ivory-deep/40 text-muted"} ${d === today ? "outline outline-1 -outline-offset-1 outline-gold" : ""}`}>
                <span className="block text-right text-[0.7rem] tabular-nums">{Number(d.slice(8))}</span>
                {items}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">▸ érkezés · ✕ kézi zárolás · ⇄ külső naptárból importált foglaltság · színek: függőben / visszaigazolt / fizetett</p>

      <div className="mt-14 grid gap-12 xl:grid-cols-2">
        <Panel title="Időszak zárolása">
          <form action={createBlockAction} className="grid gap-5 sm:grid-cols-2">
            <Field label="Első zárolt nap" name="checkIn" type="date" required />
            <Field label="Zárolás vége (első szabad nap)" name="checkOut" type="date" required />
            <Field label="Ok (belső)" name="reason" placeholder="pl. saját használat, karbantartás" className="sm:col-span-2" />
            <div className="sm:col-span-2"><Submit>Zárolás</Submit></div>
          </form>
        </Panel>
        <Panel title="Közelgő zárolások">
          {!upcomingBlocks.length && <p className="text-sm text-muted">Nincs zárolás.</p>}
          <ul className="divide-y divide-line/60">
            {upcomingBlocks.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>{formatDate(k.check_in, { month: "short", day: "numeric" })} – {formatDate(k.check_out, { month: "short", day: "numeric", year: "numeric" })}<span className="block text-xs text-muted">{k.source === "ical" ? "Importált: " : ""}{k.reason}</span></span>
                {k.source === "manual" && (
                  <form action={deleteBlockAction}><input type="hidden" name="id" value={k.id} /><button className="text-xs text-danger underline">Feloldás</button></form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
