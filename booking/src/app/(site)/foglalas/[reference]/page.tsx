import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { getBookingForGuest } from "@/lib/booking/service";
import { getPublicData } from "@/lib/public-data";
import { formatDate, formatHuf, STATUS_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Foglalásom", robots: { index: false, follow: false } };

export default async function GuestBookingPage({
  params, searchParams,
}: { params: Promise<{ reference: string }>; searchParams: Promise<{ t?: string }> }) {
  const { reference } = await params;
  const { t } = await searchParams;
  const booking = await getBookingForGuest(reference, t ?? "");
  if (!booking) notFound();
  const { property } = await getPublicData();
  const c = property.content;
  const due = Math.max(0, booking.deposit_due - booking.amount_paid);
  return (
    <>
      <Header />
      <main id="tartalom" className="wrap max-w-3xl pt-14 pb-10 md:pt-24">
        <p className="eyebrow">{STATUS_LABELS[booking.status]}</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5vw,4rem)]">
          {booking.status === "pending" ? "Köszönjük, megkaptuk foglalási igényét" : booking.status === "cancelled" ? "A foglalás lemondva" : "Foglalása rögzítve"}
        </h1>
        <p className="mt-5 text-ink-soft">
          {booking.status === "pending"
            ? "Hamarosan visszaigazoljuk az időpontot, és e-mailben elküldjük a fizetés részleteit. A foglalás a visszaigazolással válik véglegessé."
            : "A részleteket e-mailben is elküldtük. Ezt az oldalt bármikor újra megnyithatja az e-mailben kapott linkkel."}
        </p>
        <dl className="mt-12 divide-y divide-line/70 border-y border-line/70">
          {[
            ["Foglalási azonosító", booking.reference],
            ["Érkezés", formatDate(booking.check_in)],
            ["Távozás", formatDate(booking.check_out)],
            ["Vendégek", `${booking.adults} felnőtt${booking.children ? `, ${booking.children} gyermek` : ""}`],
            ["Végösszeg", formatHuf(booking.total)],
            ["Befizetve", formatHuf(booking.amount_paid)],
            ...(booking.status !== "cancelled" && due > 0 ? [["Fizetendő előleg", formatHuf(due)]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-4">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {booking.status !== "cancelled" && (
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <section>
              <h2 className="eyebrow">Fizetés</h2>
              <p className="mt-3 text-sm text-ink-soft">{c.bankTransferInfo}</p>
            </section>
            <section>
              <h2 className="eyebrow">Lemondási feltételek</h2>
              <p className="mt-3 text-sm text-ink-soft">{c.cancellationText}</p>
            </section>
          </div>
        )}
        <Link href="/" className="btn btn-ghost mt-14">Vissza a főoldalra</Link>
      </main>
    </>
  );
}
