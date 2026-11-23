"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function MobileNav({
  links, bookLabel, menuLabel, closeLabel,
}: { links: { href: string; label: string }[]; bookLabel: string; menuLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex h-11 items-center gap-3 text-[0.72rem] uppercase tracking-[0.2em]"
      >
        <span>{open ? closeLabel : menuLabel}</span>
        <span aria-hidden className="flex w-6 flex-col gap-1.5">
          <span className={`h-px bg-ink transition-transform duration-500 ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
          <span className={`h-px bg-ink transition-transform duration-500 ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
        </span>
      </button>
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-0 z-40 flex flex-col bg-ivory px-[var(--gutter)] pt-28 pb-10"
      >
        <nav aria-label="Mobil navigáció" className="flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="display border-b border-line/70 py-4 text-[2.1rem]">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/foglalas" onClick={() => setOpen(false)} className="btn btn-solid w-full">
          {bookLabel}
        </Link>
      </div>
    </div>
  );
}
