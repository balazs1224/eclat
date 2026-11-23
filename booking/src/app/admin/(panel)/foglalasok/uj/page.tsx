import { requireAdmin } from "@/lib/auth";
import { Check, Field, Notice, PageTitle, Select, Submit, TextArea } from "@/components/admin/ui";
import { createManualBookingAction } from "../../../actions";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const { msg, err } = await searchParams;
  return (
    <>
      <PageTitle eyebrow="Foglalások" title="Kézi foglalás" />
      <Notice msg={msg} err={err} />
      <form action={createManualBookingAction} className="grid max-w-3xl gap-7 sm:grid-cols-2">
        <Field label="Érkezés" name="checkIn" type="date" required />
        <Field label="Távozás" name="checkOut" type="date" required />
        <Field label="Felnőtt" name="adults" type="number" min={1} defaultValue={2} required />
        <Field label="Gyermek" name="children" type="number" min={0} defaultValue={0} />
        <Field label="Vendég neve" name="name" required className="sm:col-span-2" />
        <Field label="E-mail" name="email" type="email" />
        <Field label="Telefon" name="phone" type="tel" />
        <Field label="Ország" name="country" />
        <Select label="Státusz" name="status" defaultValue="confirmed" options={[["confirmed", "Visszaigazolt"], ["pending", "Függőben"]]} />
        <Field label="Kézi végösszeg (Ft)" name="totalOverride" type="number" min={0} hint="Üresen hagyva az árazási szabályok szerint számol." className="sm:col-span-2" />
        <TextArea label="Belső megjegyzés" name="note" className="sm:col-span-2" />
        <div className="sm:col-span-2"><Check label="Visszaigazoló e-mail a vendégnek (ha van e-mail-cím)" name="notify" /></div>
        <div className="sm:col-span-2"><Submit>Foglalás rögzítése</Submit></div>
      </form>
      <p className="mt-6 max-w-3xl text-xs text-muted">A rendszer ellenőrzi, hogy az időszak szabad-e. A minimum éjszakaszám és a foglalási előidő kézi foglalásnál nem kötelező.</p>
    </>
  );
}
