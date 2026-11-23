import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Notice, PageTitle, Panel, Submit } from "@/components/admin/ui";
import { retryEmailsAction } from "../../actions";

const STATUS: Record<string, string> = { queued: "Sorban", sent: "Elküldve", failed: "Sikertelen", logged: "Naplózva (nem küldött)" };

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { msg, err } = await searchParams;
  const rows = await query<{ id: number; to_addr: string; subject: string; body_text: string; status: string; error: string | null; created_at: string; template: string }>(
    "SELECT * FROM email_outbox ORDER BY id DESC LIMIT 100");
  const driver = process.env.EMAIL_DRIVER ?? "outbox";
  return (
    <>
      <PageTitle eyebrow="Értesítések" title="E-mailek">
        <form action={retryEmailsAction}><Submit variant="ghost">Sikertelenek újraküldése</Submit></form>
      </PageTitle>
      <Notice msg={msg} err={err} />
      <p className="mb-10 max-w-2xl text-sm text-ink-soft">
        Küldési mód: <strong>{driver === "smtp" ? "SMTP (valódi küldés)" : "csak naplózás — e-mail nem megy ki"}</strong>.
        {driver !== "smtp" && " Éles indulás előtt állítsa be az SMTP-szolgáltatót (EMAIL_DRIVER=smtp), lásd a telepítési dokumentációt."}
        {" "}A sablonok szövege a <code>src/lib/email.ts</code> fájlban található; az aláírás és a fizetési információ placeholder.
      </p>
      <Panel>
        {!rows.length && <p className="text-sm text-muted">Még nincs e-mail.</p>}
        <ul className="divide-y divide-line/60">
          {rows.map((r) => (
            <li key={r.id}>
              <details className="py-3">
                <summary className="flex cursor-pointer list-none flex-wrap justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
                  <span>{r.subject}<span className="block text-xs text-muted">{user.role === "owner" ? r.to_addr : "•••"} · {formatDateTime(r.created_at)}</span></span>
                  <span className={`text-xs ${r.status === "failed" ? "text-danger" : "text-muted"}`}>{STATUS[r.status]}</span>
                </summary>
                {user.role === "owner" && <pre className="mt-3 whitespace-pre-wrap bg-ivory-deep p-4 font-sans text-xs leading-relaxed">{r.body_text}</pre>}
                {r.error && <p className="mt-2 text-xs text-danger">{r.error}</p>}
              </details>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
