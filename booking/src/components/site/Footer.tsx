import Link from "next/link";
import type { PropertyRow } from "@/lib/property";

export function Footer({ property }: { property: PropertyRow }) {
  const c = property.content;
  return (
    <footer className="mt-[var(--section)] border-t border-line/70 bg-ivory-deep/60">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <p className="display text-4xl">Éclat</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{c.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow mb-4">Kapcsolat</p>
          <p>{c.address}</p>
          <p>{c.contactEmail}</p>
          <p>{c.contactPhone}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow mb-4">Információk</p>
          <p><Link className="link-underline" href="/foglalas">Foglalás</Link></p>
          <p><Link className="link-underline" href="/feltetelek">Foglalási feltételek</Link></p>
          <p><Link className="link-underline" href="/adatvedelem">Adatkezelési tájékoztató</Link></p>
          <p><Link className="link-underline" href="/impresszum">Impresszum</Link></p>
          <p className="pt-2 text-muted">NTAK: {c.ntakNumber}</p>
        </div>
      </div>
      <div className="wrap border-t border-line/60 py-6 text-xs text-muted">
        © {new Date().getFullYear()} Éclat · {property.name}
      </div>
    </footer>
  );
}
