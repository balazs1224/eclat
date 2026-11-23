"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/admin", "Áttekintés"],
  ["/admin/foglalasok", "Foglalások"],
  ["/admin/naptar", "Naptár és zárolás"],
  ["/admin/arak", "Árak és szabályok"],
  ["/admin/szallas", "Szállás és képek"],
  ["/admin/szinkron", "Naptárszinkron"],
  ["/admin/emailek", "E-mailek"],
  ["/admin/kimutatas", "Kimutatások"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin navigáció" className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
      {ITEMS.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-[0.8rem] tracking-[0.04em] transition-colors lg:border-l-2 ${active ? "bg-ivory-deep text-ink lg:border-gold" : "text-ink-soft hover:text-ink lg:border-transparent"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
