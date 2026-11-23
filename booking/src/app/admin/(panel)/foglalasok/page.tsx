import Link from "next/link";
import { requireAdmin, maskEmail } from "@/lib/auth";
import { getProperty } from "@/lib/property";
import { listBookings } from "@/lib/admin-queries";
import { formatDate, formatHuf, STATUS_LABELS } from "@/lib/format";
import { Notice, PageTitle, StatusBadge } from "@/components/admin/ui";

type SP = { status?: string; from?: string; to?: string; q?: string; msg?: string; err?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const property = (await getProperty())!;
  const rows = await listBookings(property.id, sp);
  const qs = new URLSearchParams(Object.entries({ status: sp.status, from: sp.from, to: sp.to, q: sp.q }).filter(([, v]) => v) as [string, string][]);
  return (
    <>
      <PageTitle eyebrow="Foglalások" title="Lista">
        <a href={`/admin/export?${qs}`} className="btn btn-ghost">CSV export</a>
        <Link href="/admin/foglalasok/uj" className="btn btn-solid">Új foglalás</Link>
      </PageTitle>
      <Notice msg={sp.msg} err={sp.err} />
      <form className="mb-10 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5 lg:gap-6" method="get">
        <label className="col-span-2 block lg:col-span-1">
          <span className="field-label">Státusz</span>
          <select name="status" defaultValue={sp.status ?? ""} className="field">
            <option value="">Mind (lejártak nélkül)</option>
            <option value="active">Aktív</option>
            {["pending", "confirmed", "paid", "cancelled", "expired"].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="block"><span className="field-label">Ettől</span><input type="date" name="from" defaultValue={sp.from} className="field" /></label>
        <label className="block"><span className="field-label">Eddig</span><input type="date" name="to" defaultValue={sp.to} className="field" /></label>
        <label className="col-span-2 block lg:col-span-1"><span className="field-label">Keresés</span><input name="q" defaultValue={sp.q} placeholder="név, e-mail, azonosító" className="field" /></label>
        <div className="col-span-2 flex items-end gap-3 lg:col-span-1"><button className="btn btn-solid w-full">Szűrés</button></div>
      </form>

      {!rows.length && <p className="text-muted">Nincs a szűrésnek megfelelő foglalás.</p>}
      {/* Asztali táblázat */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-line text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted">
            <th className="py-3 font-normal">Időszak</th><th className="font-normal">Vendég</th><th className="font-normal">Azonosító</th>
            <th className="font-normal">Forrás</th><th className="text-right font-normal">Összeg</th><th className="text-right font-normal">Befizetve</th><th className="pl-4 font-normal">Státusz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-line/60 hover:bg-ivory-deep/50">
              <td className="py-3.5"><Link href={`/admin/foglalasok/${b.id}`} className="link-underline">{formatDate(b.check_in, { month: "short", day: "numeric" })} – {formatDate(b.check_out, { year: "numeric", month: "short", day: "numeric" })}</Link></td>
              <td>{b.guest_name ?? "—"}<span className="block text-xs text-muted">{maskEmail(b.guest_email, user)}</span></td>
              <td className="font-mono text-xs">{b.reference}</td>
              <td className="text-xs text-muted">{b.source === "website" ? "Weboldal" : "Kézi"}</td>
              <td className="text-right tabular-nums">{formatHuf(b.total)}</td>
              <td className="text-right tabular-nums text-muted">{formatHuf(b.amount_paid)}</td>
              <td className="pl-4"><StatusBadge status={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobil lista */}
      <ul className="divide-y divide-line/70 border-y border-line/70 md:hidden">
        {rows.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/foglalasok/${b.id}`} className="block py-4">
              <span className="flex items-center justify-between gap-3">
                <span className="display text-xl">{formatDate(b.check_in, { month: "short", day: "numeric" })} – {formatDate(b.check_out, { month: "short", day: "numeric" })}</span>
                <StatusBadge status={b.status} />
              </span>
              <span className="mt-1 flex justify-between text-sm text-ink-soft"><span>{b.guest_name ?? "—"}</span><span className="tabular-nums">{formatHuf(b.total)}</span></span>
              <span className="text-xs text-muted">{b.reference}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
