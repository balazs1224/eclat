import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { loginAction } from "../actions";
import { Notice } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Bejelentkezés", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const { err } = await searchParams;
  return (
    <main id="tartalom" className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="display text-center text-4xl">Éclat</p>
        <p className="eyebrow mt-2 text-center">Adminisztráció</p>
        <form action={loginAction} className="mt-12 space-y-7">
          <Notice err={err} />
          <label className="block">
            <span className="field-label">E-mail</span>
            <input name="email" type="email" required autoComplete="username" className="field" />
          </label>
          <label className="block">
            <span className="field-label">Jelszó</span>
            <input name="password" type="password" required autoComplete="current-password" className="field" />
          </label>
          <button type="submit" className="btn btn-solid w-full">Belépés</button>
        </form>
      </div>
    </main>
  );
}
