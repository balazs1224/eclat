import { STATUS_LABELS } from "@/lib/format";

export function Notice({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <p role={err ? "alert" : "status"} className={`mb-8 border-l-2 py-2 pl-4 text-sm ${err ? "border-danger text-danger" : "border-success text-success"}`}>
      {err ?? msg}
    </p>
  );
}

const STATUS_STYLE: Record<string, string> = {
  hold: "border-line text-muted",
  pending: "border-gold text-gold-ink",
  confirmed: "border-lake text-lake",
  paid: "border-success text-success",
  cancelled: "border-line text-muted line-through",
  expired: "border-line text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block border px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em] whitespace-nowrap ${STATUS_STYLE[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display mt-2 text-4xl md:text-5xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function Panel({ title, children, id, className = "" }: { title?: string; children: React.ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 border-t border-line pt-6 ${className}`}>
      {title && <h2 className="eyebrow mb-5">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({
  label, name, type = "text", defaultValue, required, hint, className = "", ...rest
}: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; hint?: string; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}{required ? " *" : ""}</span>
      <input name={name} type={type} defaultValue={defaultValue ?? undefined} required={required} className="field" {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, hint, className = "" }: {
  label: string; name: string; defaultValue?: string; rows?: number; hint?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={rows} className="field resize-y leading-relaxed" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({ label, name, defaultValue, options, className = "" }: {
  label: string; name: string; defaultValue?: string; options: [string, string][]; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <select name={name} defaultValue={defaultValue} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--color-ink)]" />
      {label}
    </label>
  );
}

export function Submit({ children, variant = "solid", className = "" }: { children: React.ReactNode; variant?: "solid" | "ghost" | "danger"; className?: string }) {
  const style = variant === "danger" ? "btn btn-ghost border-danger text-danger hover:bg-danger hover:text-ivory" : `btn btn-${variant}`;
  return <button type="submit" className={`${style} ${className}`}>{children}</button>;
}

export function DemoTag() {
  return <span className="ml-2 border border-gold px-1.5 text-[0.6rem] uppercase tracking-[0.12em] text-gold-ink">demó</span>;
}
