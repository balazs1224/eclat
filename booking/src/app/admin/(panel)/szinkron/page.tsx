import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { formatDateTime } from "@/lib/format";
import { Field, Notice, PageTitle, Panel, Submit } from "@/components/admin/ui";
import { addFeedAction, deleteFeedAction, syncFeedAction } from "../../actions";

export default async function SyncPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { msg, err } = await searchParams;
  const p = (await getProperty())!;
  const feeds = await query<{ id: number; name: string; url: string; last_synced_at: string | null; last_status: string | null; last_error: string | null }>(
    "SELECT * FROM ical_feeds WHERE property_id = $1 ORDER BY name", [p.id]);
  const base = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/ical/${p.ical_export_token}.ics`;
  return (
    <>
      <PageTitle eyebrow="Csatornák" title="Naptárszinkron (iCal)" />
      <Notice msg={msg} err={err} />
      <div className="mb-12 max-w-3xl space-y-3 border-l-2 border-gold pl-5 text-sm text-ink-soft">
        <p><strong>Fontos:</strong> az iCal-szinkron nem valós idejű. Az Airbnb és a Booking.com a saját ütemezése szerint (jellemzően óránként vagy ritkábban — a pontos gyakoriságot a platformok nem garantálják) kéri le a naptárat, ez a rendszer pedig 10 percenként olvassa be a külső naptárakat.</p>
        <p>Két szinkron között ugyanaz az időpont két csatornán is lefoglalható. Ütközés esetén a rendszer figyelmeztet (áttekintő oldal + e-mail), de a feloldás kézi feladat.</p>
      </div>

      <Panel title="Export — ezt a linket adja meg a külső platformokon">
        <p className="mb-2 text-sm">Általános export (minden foglalás és zárolás, személyes adat nélkül):</p>
        <code className="block overflow-x-auto bg-ivory-deep px-3 py-2 text-xs">{base}</code>
        {feeds.length > 0 && <p className="mt-6 mb-2 text-sm">Csatornánkénti export (kihagyja az adott csatornából importált eseményeket):</p>}
        <ul className="space-y-2">
          {feeds.map((f) => <li key={f.id} className="text-xs"><span className="text-muted">{f.name}:</span> <code className="break-all bg-ivory-deep px-2 py-1">{`${base}?exclude=${f.id}`}</code></li>)}
        </ul>
        <p className="mt-4 text-xs text-muted">A link titkos tokent tartalmaz — csak a csatornák beállításaiban adja meg.</p>
      </Panel>

      <Panel title="Import — külső naptárak" className="mt-14">
        <ul className="divide-y divide-line/60">
          {feeds.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm">
              <span className="min-w-0">
                <span className="block">{f.name}</span>
                <span className="block truncate text-xs text-muted">{user.role === "owner" ? f.url : "•••"}</span>
                <span className={`text-xs ${f.last_status === "ok" ? "text-success" : f.last_status ? "text-danger" : "text-muted"}`}>
                  {f.last_synced_at ? `Utolsó szinkron: ${formatDateTime(f.last_synced_at)} — ${f.last_status === "ok" ? "rendben" : f.last_error}` : "Még nem szinkronizált"}
                </span>
              </span>
              <span className="flex gap-3">
                <form action={syncFeedAction}><input type="hidden" name="id" value={f.id} /><Submit variant="ghost">Szinkron most</Submit></form>
                {user.role === "owner" && <form action={deleteFeedAction}><input type="hidden" name="id" value={f.id} /><button className="text-xs text-danger underline">Törlés</button></form>}
              </span>
            </li>
          ))}
        </ul>
        {user.role === "owner" && (
          <form action={addFeedAction} className="mt-8 grid gap-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <Field label="Megnevezés" name="name" placeholder="pl. Airbnb" required />
            <Field label="iCal export URL (https://…)" name="url" type="url" required />
            <Submit>Hozzáadás</Submit>
          </form>
        )}
      </Panel>
    </>
  );
}
