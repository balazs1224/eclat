import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, maskEmail, maskPhone } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { refundFor } from "@/lib/booking/pricing";
import { todayIn } from "@/lib/dates";
import { formatDate, formatDateTime, formatHuf } from "@/lib/format";
import type { BookingRow } from "@/lib/booking/service";
import { Check, Field, Notice, PageTitle, Panel, Select, StatusBadge, Submit, TextArea } from "@/components/admin/ui";
import { cancelBookingAction, confirmBookingAction, modifyBookingAction, noteAction, recordPaymentAction } from "../../../actions";

const KIND: Record<string, string> = { deposit: "Előleg", balance: "Hátralék", full: "Teljes összeg", refund: "Visszatérítés" };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  const { msg, err } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await queryOne<BookingRow & { privacy_accepted_at: string | null }>("SELECT * FROM bookings WHERE id = $1", [id]);
  if (!b) notFound();
  const property = (await getProperty())!;
  const payments = await query<{ id: number; kind: string; amount: number; provider: string; note: string | null; recorded_by: string | null; created_at: string }>(
    "SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at", [id]);
  const log = await query<{ actor: string; action: string; at: string; details: Record<string, unknown> }>(
    "SELECT actor, action, at, details FROM audit_log WHERE entity_type = 'booking' AND entity_id = $1 ORDER BY at DESC LIMIT 30", [id]);
  const q = b.price;
  const active = ["pending", "confirmed", "paid"].includes(b.status);
  const refund = refundFor(property.cancellation_rules, b.check_in, todayIn(), b.amount_paid);
  const remaining = Math.max(0, b.total - b.amount_paid);
  const depositRemaining = Math.max(0, b.deposit_due - b.amount_paid);

  return (
    <>
      <PageTitle eyebrow={`Foglalás · ${b.reference}`} title={b.guest_name ?? "Foglalás"}>
        <Link href="/admin/foglalasok" className="btn btn-ghost">← Lista</Link>
      </PageTitle>
      <Notice msg={msg} err={err} />
      <div className="grid gap-12 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-12">
          <Panel title="Adatok">
            <div className="mb-6"><StatusBadge status={b.status} /> <span className="ml-2 text-xs text-muted">{b.source === "website" ? "Weboldalról" : "Kézi rögzítés"} · {formatDateTime(b.created_at)}</span></div>
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Érkezés", formatDate(b.check_in)], ["Távozás", formatDate(b.check_out)],
                ["Éjszakák", String(q.nights ?? "")], ["Vendégek", `${b.adults} felnőtt, ${b.children} gyermek`],
                ["E-mail", maskEmail(b.guest_email, user)], ["Telefon", maskPhone(b.guest_phone, user)],
                ["Ország", b.guest_country ?? "—"], ["Adatkezelés elfogadva", b.privacy_accepted_at ? formatDateTime(b.privacy_accepted_at) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-line/60 pb-2"><dt className="text-xs text-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {user.role !== "owner" && <p className="mt-3 text-xs text-muted">A vendég elérhetőségei kezelői jogosultsággal maszkolva jelennek meg.</p>}
            {b.guest_message && <p className="mt-6 border-l-2 border-gold pl-4 text-sm text-ink-soft">„{b.guest_message}”</p>}
            {b.cancel_reason && <p className="mt-4 text-sm text-muted">Lemondás oka: {b.cancel_reason}</p>}
          </Panel>

          <Panel title="Ár">
            <dl className="space-y-2 text-sm">
              {q.nightly && <div className="flex justify-between"><dt>Szállásdíj ({q.nights} éj)</dt><dd className="tabular-nums">{formatHuf(q.accommodation)}</dd></div>}
              {q.extraGuests?.amount > 0 && <div className="flex justify-between"><dt>Extra vendég</dt><dd className="tabular-nums">{formatHuf(q.extraGuests.amount)}</dd></div>}
              {q.fees?.map((f) => <div key={f.name} className="flex justify-between"><dt>{f.name}</dt><dd className="tabular-nums">{formatHuf(f.amount)}</dd></div>)}
              {q.discount && <div className="flex justify-between text-success"><dt>Kedvezmény ({q.discount.code})</dt><dd className="tabular-nums">−{formatHuf(q.discount.amount)}</dd></div>}
              {q.manualTotal && <p className="text-xs text-gold-ink">A végösszeget kézzel adták meg.</p>}
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Végösszeg</dt><dd className="display text-2xl tabular-nums">{formatHuf(b.total)}</dd></div>
              <div className="flex justify-between"><dt>Előleg</dt><dd className="tabular-nums">{formatHuf(b.deposit_due)}</dd></div>
              <div className="flex justify-between"><dt>Befizetve</dt><dd className="tabular-nums">{formatHuf(b.amount_paid)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Hátralévő</dt><dd className="tabular-nums">{formatHuf(remaining)}</dd></div>
            </dl>
            {payments.length > 0 && (
              <ul className="mt-6 space-y-1 text-xs text-muted">
                {payments.map((p) => <li key={p.id}>{formatDateTime(p.created_at)} · {KIND[p.kind]} · {formatHuf(p.amount)} · {p.provider}{p.note ? ` · ${p.note}` : ""} · {p.recorded_by}</li>)}
              </ul>
            )}
          </Panel>

          <Panel title="Belső megjegyzés">
            <form action={noteAction} className="space-y-4">
              <input type="hidden" name="id" value={b.id} />
              <TextArea label="Megjegyzés (vendég nem látja)" name="note" defaultValue={b.admin_note ?? ""} />
              <Submit variant="ghost">Mentés</Submit>
            </form>
          </Panel>
        </div>

        <div className="space-y-12">
          {b.status === "pending" && (
            <Panel title="Jóváhagyás">
              <form action={confirmBookingAction} className="space-y-4">
                <input type="hidden" name="id" value={b.id} />
                <Check label="Visszaigazoló e-mail küldése a vendégnek" name="notify" defaultChecked />
                <Submit>Foglalás visszaigazolása</Submit>
              </form>
            </Panel>
          )}

          {active && (
            <Panel title="Befizetés rögzítése">
              <form action={recordPaymentAction} className="grid gap-5 sm:grid-cols-2">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Összeg (Ft)" name="amount" type="number" min={1} required defaultValue={depositRemaining || remaining || ""} />
                <Select label="Típus" name="kind" defaultValue={depositRemaining ? "deposit" : "balance"} options={Object.entries(KIND)} />
                <Field label="Megjegyzés (pl. átutalás dátuma)" name="note" className="sm:col-span-2" />
                <div className="sm:col-span-2"><Check label="Értesítés a vendégnek" name="notify" defaultChecked /></div>
                <div className="sm:col-span-2"><Submit>Befizetés rögzítése</Submit></div>
              </form>
              <p className="mt-3 text-xs text-muted">Online fizetési szolgáltató még nincs bekötve — a befizetést a beérkezés ellenőrzése után rögzítse.</p>
            </Panel>
          )}

          {active && (
            <Panel title="Módosítás">
              <form action={modifyBookingAction} className="grid gap-5 sm:grid-cols-2">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Érkezés" name="checkIn" type="date" required defaultValue={b.check_in} />
                <Field label="Távozás" name="checkOut" type="date" required defaultValue={b.check_out} />
                <Field label="Felnőtt" name="adults" type="number" min={1} required defaultValue={b.adults} />
                <Field label="Gyermek" name="children" type="number" min={0} required defaultValue={b.children} />
                <Field label="Kézi végösszeg (Ft, üresen: újraszámolás)" name="totalOverride" type="number" min={0} className="sm:col-span-2" />
                <div className="sm:col-span-2"><Submit variant="ghost">Módosítás mentése</Submit></div>
              </form>
              <p className="mt-3 text-xs text-muted">A rendszer ütközést ellenőriz; a minimum éjszakaszám adminként nem kötelező. A vendég nem kap automatikus értesítést a módosításról.</p>
            </Panel>
          )}

          {active && (
            <Panel title="Lemondás">
              <p className="mb-4 text-sm text-ink-soft">
                A lemondási szabályok szerint ma <strong>{refund.percent}%</strong> visszatérítés járna a befizetett összegből: <strong>{formatHuf(refund.amount)}</strong>.
                A visszautalást a rendszer nem végzi el — rögzítse „Visszatérítés” befizetésként.
              </p>
              <form action={cancelBookingAction} className="space-y-4">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Lemondás oka" name="reason" />
                <Check label="Értesítés a vendégnek" name="notify" defaultChecked />
                <Submit variant="danger">Foglalás lemondása</Submit>
              </form>
            </Panel>
          )}

          {b.status === "cancelled" && b.amount_paid > 0 && (
            <Panel title="Visszatérítés rögzítése">
              <form action={recordPaymentAction} className="grid gap-5 sm:grid-cols-2">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="kind" value="refund" />
                <Field label="Visszautalt összeg (Ft)" name="amount" type="number" min={1} max={b.amount_paid} required defaultValue={refund.amount || ""} />
                <Field label="Megjegyzés" name="note" />
                <div className="sm:col-span-2"><Submit variant="ghost">Visszatérítés rögzítése</Submit></div>
              </form>
            </Panel>
          )}

          <Panel title="Előzmények">
            <ul className="space-y-2 text-xs text-muted">
              {log.map((l, i) => <li key={i}>{formatDateTime(l.at)} · {l.action} · {l.actor}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
