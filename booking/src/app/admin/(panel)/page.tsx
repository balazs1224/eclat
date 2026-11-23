import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getProperty } from "@/lib/property";
import { dashboard } from "@/lib/admin-queries";
import { formatDate, formatHuf } from "@/lib/format";
import { Notice, PageTitle, Panel, StatusBadge } from "@/components/admin/ui";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { msg, err } = await searchParams;
  const property = (await getProperty())!;
  const d = await dashboard(property.id);
  const stats: [string, string, string?][] = [
    ["Függőben lévő igény", String(d.pending), "/admin/foglalasok?status=pending"],
    ["Foglaltság (köv. 30 nap)", `${d.occupancy30}%`],
    [`Foglalási érték ${d.year}`, formatHuf(d.revenue)],
    [`Befizetve ${d.year}`, formatHuf(d.paid)],
    ["Kintlévőség", formatHuf(d.outstanding)],
  ];
  const problems = d.feeds.filter((f) => f.last_status === "conflict" || f.last_status === "error");
  return (
    <>
      <PageTitle eyebrow={`Üdv, ${user.name}`} title="Áttekintés">
        <Link href="/admin/foglalasok/uj" className="btn btn-solid">Új foglalás</Link>
      </PageTitle>
      <Notice msg={msg} err={err} />
      {problems.map((f) => (
        <p key={f.id} role="alert" className="mb-6 border-l-2 border-danger bg-danger/5 py-3 pl-4 text-sm text-danger">
          <strong>{f.name}:</strong> {f.last_status === "conflict" ? "lehetséges dupla foglalás — " : "szinkron hiba — "}{f.last_error}{" "}
          <Link href="/admin/szinkron" className="underline">Részletek</Link>
        </p>
      ))}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-line py-8 md:grid-cols-5">
        {stats.map(([k, v, href]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">{k}</dt>
            <dd className="display mt-2 text-3xl tabular-nums">{href ? <Link href={href} className="link-underline">{v}</Link> : v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-12 grid gap-12 xl:grid-cols-2">
        <Panel title="Következő érkezések">
          <BookingList rows={d.arrivals} empty="Nincs közelgő érkezés." />
        </Panel>
        <Panel title="Legutóbbi foglalások">
          <BookingList rows={d.recent} empty="Még nincs foglalás." />
        </Panel>
      </div>
    </>
  );
}

function BookingList({ rows, empty }: { rows: Awaited<ReturnType<typeof dashboard>>["recent"]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/foglalasok/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-ivory-deep/50">
            <span>
              <span className="block">{b.guest_name ?? "—"}</span>
              <span className="text-xs text-muted">{formatDate(b.check_in, { month: "short", day: "numeric" })} – {formatDate(b.check_out, { month: "short", day: "numeric", year: "numeric" })} · {b.reference}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-sm tabular-nums">{formatHuf(b.total)}</span>
              <StatusBadge status={b.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
