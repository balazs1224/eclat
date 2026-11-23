import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur-sm lg:h-svh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 pt-4 lg:block lg:px-5 lg:pt-8">
          <Link href="/admin" className="display text-2xl">Éclat <span className="text-sm text-gold-ink">admin</span></Link>
          <form action={logoutAction} className="lg:hidden"><button className="text-xs uppercase tracking-[0.14em] text-muted">Kilépés</button></form>
        </div>
        <div className="px-2 py-3 lg:mt-8 lg:px-3">
          <AdminNav />
        </div>
        <div className="hidden px-5 text-xs text-muted lg:absolute lg:bottom-6 lg:block">
          <p>{user.name}</p>
          <p className="mb-3">{user.role === "owner" ? "Tulajdonos" : "Kezelő"}</p>
          <Link href="/" className="link-underline mr-4">Weboldal ↗</Link>
          <form action={logoutAction} className="inline"><button className="link-underline">Kilépés</button></form>
        </div>
      </aside>
      <main id="tartalom" className="min-w-0 px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
