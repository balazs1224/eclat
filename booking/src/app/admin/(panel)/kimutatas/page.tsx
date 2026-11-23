import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getProperty } from "@/lib/property";
import { monthReport } from "@/lib/admin-queries";
import { formatHuf } from "@/lib/format";
import { todayIn } from "@/lib/dates";
import { PageTitle } from "@/components/admin/ui";

const MONTHS = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  await requireAdmin();
  const { y } = await searchParams;
  const year = /^\d{4}$/.test(y ?? "") ? Number(y) : Number(todayIn().slice(0, 4));
  const p = (await getProperty())!;
  const rows = await monthReport(p.id, year);
  const sum = rows.reduce((a, r) => ({
    bookings: a.bookings + r.bookings, nights: a.nights + r.nights, revenue: a.revenue + r.revenue, paid: a.paid + r.paid, cancelled: a.cancelled + r.cancelled,
  }), { bookings: 0, nights: 0, revenue: 0, paid: 0, cancelled: 0 });
  return (
    <>
      <PageTitle eyebrow="Kimutatások" title={`${year}`}>
        <Link href={`/admin/kimutatas?y=${year - 1}`} className="btn btn-ghost">← {year - 1}</Link>
        <Link href={`/admin/kimutatas?y=${year + 1}`} className="btn btn-ghost">{year + 1} →</Link>
        <a href={`/admin/export?from=${year}-01-01&to=${year + 1}-01-01&status=all`} className="btn btn-ghost">CSV</a>
      </PageTitle>
      <dl className="mb-12 grid grid-cols-2 gap-6 border-y border-line py-8 md:grid-cols-5">
        {[["Foglalás", String(sum.bookings)], ["Eltöltött éjszaka", String(sum.nights)], ["Visszaigazolt érték", formatHuf(sum.revenue)], ["Befizetve", formatHuf(sum.paid)], ["Lemondás", String(sum.cancelled)]].map(([k, v]) => (
          <div key={k}><dt className="text-xs uppercase tracking-[0.14em] text-muted">{k}</dt><dd className="display mt-2 text-3xl tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Havi bontás az érkezés hónapja szerint</caption>
          <thead>
            <tr className="border-b border-line text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted">
              <th className="py-3 font-normal">Hónap</th><th className="font-normal">Foglaltság</th><th className="text-right font-normal">Foglalás</th>
              <th className="text-right font-normal">Éjszaka</th><th className="text-right font-normal">Érték</th><th className="text-right font-normal">Befizetve</th><th className="text-right font-normal">Web / kézi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-line/60">
                <td className="py-3">{MONTHS[r.month - 1]}</td>
                <td className="w-1/4 pr-6">
                  <span className="flex items-center gap-3">
                    <span className="h-1.5 flex-1 bg-ivory-deep"><span className="block h-full bg-gold" style={{ width: `${Math.min(100, r.occupancy)}%` }} /></span>
                    <span className="w-10 text-right tabular-nums text-muted">{r.occupancy}%</span>
                  </span>
                </td>
                <td className="text-right tabular-nums">{r.bookings}</td>
                <td className="text-right tabular-nums">{r.nights}</td>
                <td className="text-right tabular-nums">{formatHuf(r.revenue)}</td>
                <td className="text-right tabular-nums">{formatHuf(r.paid)}</td>
                <td className="text-right tabular-nums text-muted">{r.website} / {r.admin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">A hónapot az érkezés napja határozza meg. Az érték a visszaigazolt és fizetett foglalások végösszege. A külső csatornán (Airbnb, Booking.com) érkezett foglalások nem szerepelnek, csak zárolásként látszanak.</p>
    </>
  );
}
