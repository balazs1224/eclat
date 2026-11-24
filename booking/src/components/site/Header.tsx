import Link from "next/link";
import { getDict } from "@/i18n/hu";
import { MobileNav } from "./MobileNav";

export function Header({ overlay = false }: { overlay?: boolean }) {
  const t = getDict().nav;
  const links = [
    { href: "/#szallas", label: t.stay },
    { href: "/#galeria", label: t.gallery },
    { href: "/#felszereltseg", label: t.amenities },
    { href: "/#kornyek", label: t.area },
    { href: "/#informaciok", label: t.info },
  ];
  return (
    <header
      className={`${overlay ? "absolute" : "sticky bg-ivory/92 backdrop-blur-sm border-b border-line/60"} inset-x-0 top-0 z-40`}
    >
      <div className="wrap flex h-18 items-center justify-between gap-6 md:h-22">
        <Link href="/" className="group relative z-50 flex items-baseline gap-3" aria-label="Éclat — főoldal">
          <span className="display text-[1.9rem] leading-none tracking-wide">Éclat</span>
          <span className="hidden text-[0.62rem] uppercase tracking-[0.32em] text-gold-ink sm:inline">Balatonboglár</span>
        </Link>
        <nav aria-label="Fő navigáció" className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="link-underline text-[0.78rem] uppercase tracking-[0.16em] text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          ))}
          <Link href="/foglalas" className="btn btn-solid min-h-0 py-2.5">
            {t.book}
          </Link>
        </nav>
        <MobileNav links={links} bookLabel={t.book} menuLabel={t.menu} closeLabel={t.close} />
      </div>
    </header>
  );
}
