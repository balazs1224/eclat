import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { Check, Field, Notice, PageTitle, Panel, Submit, TextArea } from "@/components/admin/ui";
import { deleteMediaAction, updateContentAction, updateMediaAction, uploadMediaAction } from "../../actions";

export default async function PropertyPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireAdmin();
  const { msg, err } = await searchParams;
  const p = (await getProperty())!;
  const c = p.content;
  const media = await query<{ id: string; alt: string; caption: string; sort: number; is_cover: boolean; width: number; height: number }>(
    "SELECT id, alt, caption, sort, is_cover, width, height FROM media WHERE property_id = $1 ORDER BY is_cover DESC, sort, created_at",
    [p.id],
  );
  const readOnly = user.role !== "owner";
  return (
    <>
      <PageTitle eyebrow="Tartalom" title="Szállás és képek" />
      <Notice msg={msg} err={err} />
      <p className="mb-10 max-w-2xl text-sm text-muted">
        A [PLACEHOLDER] jelölésű szövegek a weboldalon is így jelennek meg, amíg nem cseréli őket jóváhagyott tartalomra.
        Csak valós, ellenőrzött információt adjon meg (felszereltség, távolságok, jogi szövegek).
      </p>
      <fieldset disabled={readOnly} className="space-y-14">
        <Panel title="Képek" id="kepek">
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((m) => (
              <li key={m.id} className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${m.id}?size=thumb`} alt={m.alt} width={m.width} height={m.height} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <form action={updateMediaAction} className="grid gap-3">
                  <input type="hidden" name="id" value={m.id} />
                  <Field label="Alternatív szöveg (akadálymentesség)" name="alt" defaultValue={m.alt} />
                  <Field label="Sorrend" name="sort" type="number" defaultValue={m.sort} />
                  <Check label="Borítókép" name="isCover" defaultChecked={m.is_cover} />
                  <Submit variant="ghost">Mentés</Submit>
                </form>
                <form action={deleteMediaAction}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-danger underline">Kép törlése</button></form>
              </li>
            ))}
          </ul>
          {!media.length && <p className="text-sm text-muted">Még nincs feltöltött kép — a weboldal jelölt helykitöltőket mutat.</p>}
          <form action={uploadMediaAction} className="mt-8 grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="field-label">Képek (JPG, PNG, WebP, HEIC — max. 15 MB)</span>
              <input type="file" name="files" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" multiple required className="mt-2 block w-full text-sm" />
            </label>
            <Field label="Alternatív szöveg" name="alt" placeholder="pl. Nappali a kertre néző ablakokkal" />
            <Submit>Feltöltés</Submit>
          </form>
          <p className="mt-3 text-xs text-muted">Feltöltéskor a képek WebP formátumba és két méretbe kerülnek, a metaadatok (pl. GPS-hely) törlődnek.</p>
        </Panel>

        <Panel title="Szövegek">
          <form action={updateContentAction} className="grid gap-7 lg:grid-cols-2">
            <Field label="Szállás neve" name="name" defaultValue={p.name} />
            <Field label="Rövid jelmondat" name="tagline" defaultValue={c.tagline} />
            <TextArea label="Rövid bemutatkozás (főoldal teteje)" name="intro" defaultValue={c.intro} />
            <TextArea label="Hosszabb bemutatkozás" name="story" defaultValue={c.story} rows={5} />
            <TextArea label="Kiemelések (soronként egy)" name="highlights" defaultValue={c.highlights.join("\n")} rows={4} />
            <TextArea
              label="Felszereltség"
              name="amenities"
              rows={8}
              defaultValue={c.amenities.map((g) => `# ${g.group}\n${g.items.map((i) => `- ${i}`).join("\n")}`).join("\n")}
              hint="Csoportcím: # kezdetű sor. Tétel: - kezdetű sor."
            />
            <TextArea label="Környék leírása" name="surroundings" defaultValue={c.surroundings} rows={4} />
            <TextArea label="Távolságok (soronként: megnevezés | érték)" name="distances" defaultValue={c.distances.map((d) => `${d.label} | ${d.value}`).join("\n")} rows={4} />
            <TextArea label="Vendéginformációk (soronként: cím | szöveg)" name="guestInfo" defaultValue={c.guestInfo.map((g) => `${g.title} | ${g.text}`).join("\n")} rows={5} className="lg:col-span-2" />
            <TextArea label="Házirend" name="houseRules" defaultValue={c.houseRules} rows={4} />
            <TextArea label="Lemondási feltételek (vendégnek megjelenő szöveg)" name="cancellationText" defaultValue={c.cancellationText} rows={4} />
            <TextArea label="Fizetési / átutalási információ (e-mailben és a foglalás oldalán)" name="bankTransferInfo" defaultValue={c.bankTransferInfo} rows={3} />
            <div className="grid gap-7">
              <Field label="Cím" name="address" defaultValue={c.address} />
              <Field label="Kapcsolati e-mail" name="contactEmail" defaultValue={c.contactEmail} />
              <Field label="Telefonszám" name="contactPhone" defaultValue={c.contactPhone} />
              <Field label="NTAK regisztrációs szám" name="ntakNumber" defaultValue={c.ntakNumber} />
            </div>
            <TextArea label="Adatkezelési tájékoztató" name="privacyPolicy" defaultValue={c.privacyPolicy} rows={8} />
            <TextArea label="Foglalási feltételek (ÁSZF)" name="terms" defaultValue={c.terms} rows={8} />
            <div className="lg:col-span-2"><Submit>Tartalom mentése</Submit></div>
          </form>
        </Panel>
      </fieldset>
    </>
  );
}
