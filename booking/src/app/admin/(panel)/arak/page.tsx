import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProperty, loadSeasons } from "@/lib/property";
import { todayIn } from "@/lib/dates";
import { formatDate, formatHuf } from "@/lib/format";
import { Check, DemoTag, Field, Notice, PageTitle, Panel, Select, Submit, TextArea } from "@/components/admin/ui";
import {
  deleteCouponAction, deleteFeeAction, deleteOverrideAction, deleteSeasonAction, updateRulesAction, upsertCouponAction,
  upsertFeeAction, upsertOverrideAction, upsertSeasonAction,
} from "../../actions";

const FEE_KIND: [string, string][] = [["per_stay", "Tartózkodásonként"], ["per_night", "Éjszakánként"], ["per_guest_night", "Vendég/éjszaka"]];
const WEEKDAYS: [number, string][] = [[1, "H"], [2, "K"], [3, "Sze"], [4, "Cs"], [5, "P"], [6, "Szo"], [7, "V"]];

function Row({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line/60">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3 text-sm [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="text-xs text-gold-ink group-open:hidden">Szerkesztés</span>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { msg, err } = await searchParams;
  const p = (await getProperty())!;
  const readOnly = user.role !== "owner";
  const seasons = await loadSeasons(p.id);
  const overrides = await query<{ id: number; date: string; nightly_rate: number | null; min_nights: number | null; label: string; kind: string }>(
    "SELECT * FROM rate_overrides WHERE property_id = $1 AND date >= $2 ORDER BY date LIMIT 200", [p.id, todayIn()]);
  const fees = await query<{ id: number; name: string; kind: string; amount: number; active: boolean }>("SELECT * FROM fees WHERE property_id = $1 ORDER BY sort, id", [p.id]);
  const coupons = await query<{ id: number; code: string; kind: string; value: number; valid_from: string | null; valid_to: string | null; min_nights: number | null; max_uses: number | null; used_count: number; active: boolean }>(
    "SELECT * FROM coupons WHERE property_id = $1 ORDER BY active DESC, code", [p.id]);
  const isDemo = (s: string) => s.includes("DEMÓ");

  return (
    <>
      <PageTitle eyebrow="Árazás" title="Árak és szabályok" />
      <Notice msg={msg} err={err} />
      {readOnly && <p className="mb-8 text-sm text-muted">Az árak módosításához tulajdonosi jogosultság szükséges.</p>}

      <fieldset disabled={readOnly} className="space-y-14">
        <Panel title="Alapszabályok">
          <form action={updateRulesAction} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Alap éjszakadíj (Ft)" name="baseNightlyRate" type="number" min={0} defaultValue={p.base_nightly_rate} hint="Ha egyik szezon sem érvényes." />
            <Field label="Alapárban foglalt vendég" name="baseGuests" type="number" min={1} defaultValue={p.base_guests} />
            <Field label="Extra vendég díja (Ft/fő/éj)" name="extraGuestFee" type="number" min={0} defaultValue={p.extra_guest_fee} />
            <Field label="Max. vendégszám" name="maxGuests" type="number" min={1} defaultValue={p.max_guests} />
            <Field label="Alap minimum éjszaka" name="defaultMinNights" type="number" min={1} defaultValue={p.default_min_nights} />
            <Field label="Foglalás legalább ennyi nappal előre" name="minAdvanceDays" type="number" min={0} defaultValue={p.min_advance_days} />
            <Field label="Foglalás legfeljebb ennyi nappal előre" name="maxAdvanceDays" type="number" min={1} defaultValue={p.max_advance_days} />
            <Select label="Foglalási folyamat" name="bookingMode" defaultValue={p.booking_mode} options={[["request", "Foglalási igény + jóváhagyás"], ["instant", "Azonnali visszaigazolás"]]} />
            <Select label="Fizetés" name="paymentMode" defaultValue={p.payment_mode} options={[["deposit", "Előleg + hátralék"], ["full", "Teljes összeg"]]} />
            <Field label="Előleg (%)" name="depositPercent" type="number" min={0} max={100} defaultValue={p.deposit_percent} />
            <Field label="Hátralék esedékes (nappal érkezés előtt)" name="balanceDueDays" type="number" min={0} defaultValue={p.balance_due_days} />
            <Field label="Bejelentkezés" name="checkInTime" defaultValue={p.check_in_time} />
            <Field label="Kijelentkezés" name="checkOutTime" defaultValue={p.check_out_time} />
            <div className="sm:col-span-2">
              <span className="field-label">Hétvégi éjszakák (az éjszaka kezdőnapja)</span>
              <div className="mt-3 flex flex-wrap gap-4">
                {WEEKDAYS.map(([n, l]) => (
                  <label key={n} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="weekendNights" value={n} defaultChecked={p.weekend_nights.includes(n)} className="h-4 w-4 accent-[var(--color-ink)]" />{l}
                  </label>
                ))}
              </div>
            </div>
            <TextArea
              label="Lemondási szabályok (napok:visszatérítés%)"
              name="cancellationRules"
              rows={4}
              defaultValue={p.cancellation_rules.map((r) => `${r.daysBefore}:${r.refundPercent}`).join("\n")}
              hint="Soronként: érkezés előtti napok:százalék. Pl. 30:100 → 30+ nappal előtte 100%."
              className="sm:col-span-2"
            />
            <div className="sm:col-span-full"><Submit>Alapszabályok mentése</Submit></div>
          </form>
        </Panel>

        <Panel title="Szezonok">
          {seasons.map((s) => (
            <Row key={s.id} summary={<span className="flex flex-wrap gap-x-6 gap-y-1"><strong className="font-normal">{s.name}{isDemo(s.name) && <DemoTag />}</strong><span className="text-muted">{formatDate(s.startDate, { month: "short", day: "numeric", year: "numeric" })} – {formatDate(s.endDate, { month: "short", day: "numeric" })}</span><span className="tabular-nums">{formatHuf(s.nightlyRate)}{s.weekendRate !== null && ` / hétvége ${formatHuf(s.weekendRate)}`}</span>{s.minNights && <span className="text-muted">min. {s.minNights} éj</span>}</span>}>
              <SeasonForm s={s} />
              <form action={deleteSeasonAction} className="mt-3"><input type="hidden" name="id" value={s.id} /><button className="text-xs text-danger underline">Szezon törlése</button></form>
            </Row>
          ))}
          <details className="mt-6"><summary className="btn btn-ghost cursor-pointer list-none">+ Új szezon</summary><div className="mt-6"><SeasonForm /></div></details>
        </Panel>

        <Panel title="Egyedi napok és ünnepnapi árak">
          {overrides.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 py-3 text-sm">
              <span className="flex flex-wrap gap-x-6"><span>{formatDate(o.date)}</span><span className="text-muted">{o.label}{isDemo(o.label) && <DemoTag />}</span>{o.nightly_rate !== null && <span className="tabular-nums">{formatHuf(o.nightly_rate)}</span>}{o.min_nights && <span className="text-muted">min. {o.min_nights} éj (érkezéskor)</span>}</span>
              <form action={deleteOverrideAction}><input type="hidden" name="id" value={o.id} /><button className="text-xs text-danger underline">Törlés</button></form>
            </div>
          ))}
          <form action={upsertOverrideAction} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Nap" name="date" type="date" required />
            <Field label="Éjszakadíj (Ft)" name="nightlyRate" type="number" min={0} />
            <Field label="Min. éjszaka (ha ekkor érkezik)" name="minNights" type="number" min={1} />
            <Field label="Megnevezés" name="label" placeholder="pl. Augusztus 20." />
            <Select label="Típus" name="kind" options={[["holiday", "Ünnepnap"], ["custom", "Egyedi"]]} />
            <div className="sm:col-span-full"><Submit variant="ghost">Nap mentése</Submit></div>
          </form>
        </Panel>

        <Panel title="Takarítási díj és további költségek">
          {fees.map((f) => (
            <Row key={f.id} summary={<span className="flex flex-wrap gap-x-6"><span className={f.active ? "" : "text-muted line-through"}>{f.name}{isDemo(f.name) && <DemoTag />}</span><span className="text-muted">{FEE_KIND.find(([k]) => k === f.kind)?.[1]}</span><span className="tabular-nums">{formatHuf(f.amount)}</span></span>}>
              <FeeForm f={f} />
              <form action={deleteFeeAction} className="mt-3"><input type="hidden" name="id" value={f.id} /><button className="text-xs text-danger underline">Tétel törlése</button></form>
            </Row>
          ))}
          <details className="mt-6"><summary className="btn btn-ghost cursor-pointer list-none">+ Új költségtétel</summary><div className="mt-6"><FeeForm /></div></details>
        </Panel>

        <Panel title="Kuponkódok">
          {coupons.map((c) => (
            <Row key={c.id} summary={<span className="flex flex-wrap gap-x-6"><span className={`font-mono ${c.active ? "" : "text-muted line-through"}`}>{c.code}</span><span>{c.kind === "percent" ? `${c.value}%` : formatHuf(c.value)}</span><span className="text-muted">felhasználva: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</span></span>}>
              <CouponForm c={c} />
              <form action={deleteCouponAction} className="mt-3"><input type="hidden" name="id" value={c.id} /><button className="text-xs text-danger underline">Törlés (felhasznált kupon inaktiválódik)</button></form>
            </Row>
          ))}
          <details className="mt-6"><summary className="btn btn-ghost cursor-pointer list-none">+ Új kupon</summary><div className="mt-6"><CouponForm /></div></details>
          <p className="mt-4 text-xs text-muted">A kedvezmény a szállásdíjra (éjszakák + extra vendég) vonatkozik, a további költségekre nem. Az érvényességi időszak az érkezés napjára értendő.</p>
        </Panel>
      </fieldset>
    </>
  );
}

function SeasonForm({ s }: { s?: Awaited<ReturnType<typeof loadSeasons>>[number] }) {
  return (
    <form action={upsertSeasonAction} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Név" name="name" required defaultValue={s?.name} className="sm:col-span-2" />
      <Field label="Kezdete" name="startDate" type="date" required defaultValue={s?.startDate} />
      <Field label="Vége (utolsó éjszaka)" name="endDate" type="date" required defaultValue={s?.endDate} />
      <Field label="Éjszakadíj (Ft)" name="nightlyRate" type="number" min={0} required defaultValue={s?.nightlyRate} />
      <Field label="Hétvégi díj (Ft)" name="weekendRate" type="number" min={0} defaultValue={s?.weekendRate} />
      <Field label="Min. éjszaka" name="minNights" type="number" min={1} defaultValue={s?.minNights} />
      <Field label="Prioritás" name="priority" type="number" defaultValue={s?.priority ?? 0} hint="Átfedésnél a nagyobb érvényes." />
      <div className="sm:col-span-full"><Submit variant="ghost">Szezon mentése</Submit></div>
    </form>
  );
}

function FeeForm({ f }: { f?: { id: number; name: string; kind: string; amount: number; active: boolean } }) {
  return (
    <form action={upsertFeeAction} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field label="Megnevezés" name="name" required defaultValue={f?.name} className="sm:col-span-2" />
      <Select label="Számítás" name="kind" defaultValue={f?.kind ?? "per_stay"} options={FEE_KIND} />
      <Field label="Összeg (Ft)" name="amount" type="number" min={0} required defaultValue={f?.amount} />
      <Check label="Aktív" name="active" defaultChecked={f?.active ?? true} />
      <div className="sm:col-span-full"><Submit variant="ghost">Tétel mentése</Submit></div>
    </form>
  );
}

function CouponForm({ c }: { c?: { id: number; code: string; kind: string; value: number; valid_from: string | null; valid_to: string | null; min_nights: number | null; max_uses: number | null; active: boolean } }) {
  return (
    <form action={upsertCouponAction} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Kód" name="code" required defaultValue={c?.code} />
      <Select label="Típus" name="kind" defaultValue={c?.kind ?? "percent"} options={[["percent", "Százalék"], ["fixed", "Fix összeg (Ft)"]]} />
      <Field label="Mérték" name="value" type="number" min={1} required defaultValue={c?.value} />
      <Field label="Min. éjszaka" name="minNights" type="number" min={1} defaultValue={c?.min_nights} />
      <Field label="Érvényes (érkezés) ettől" name="validFrom" type="date" defaultValue={c?.valid_from} />
      <Field label="Érvényes eddig" name="validTo" type="date" defaultValue={c?.valid_to} />
      <Field label="Max. felhasználás" name="maxUses" type="number" min={1} defaultValue={c?.max_uses} />
      <Check label="Aktív" name="active" defaultChecked={c?.active ?? true} />
      <div className="sm:col-span-full"><Submit variant="ghost">Kupon mentése</Submit></div>
    </form>
  );
}
