import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Visual, type Tone } from "@/components/site/Visual";
import { MapEmbed } from "@/components/site/MapEmbed";
import { getDict } from "@/i18n/hu";
import { getPublicData, isPlaceholder } from "@/lib/public-data";

export default async function HomePage() {
  const { property, media } = await getPublicData();
  const t = getDict();
  const c = property.content;
  const cover = media.find((m) => m.is_cover) ?? media[0] ?? null;
  const gallery = media.filter((m) => m !== cover);
  const g = (i: number) => gallery[i] ?? null;
  const galleryTones: Tone[] = ["dusk", "reed", "lake", "stone", "dusk"];

  const jsonLd = !isPlaceholder(property.name)
    ? {
        "@context": "https://schema.org",
        "@type": "LodgingBusiness",
        name: property.name,
        address: { "@type": "PostalAddress", addressLocality: "Balatonboglár", addressCountry: "HU" },
      }
    : null;

  return (
    <div className="relative">
      <Header overlay />
      <main id="tartalom">
        {/* ——— Hero ——— */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[62svh] md:inset-y-0 md:left-[34%] md:h-auto">
            <div className="fade-bottom h-full w-full md:[mask-image:linear-gradient(90deg,transparent_0%,#000_28%,#000_70%,transparent_100%),linear-gradient(180deg,#000_70%,transparent_100%)] md:[mask-composite:intersect]">
              <div className="drift h-full w-full">
                <Visual media={cover} label="borítókép" tone="lake" illustration="salon" priority tagClassName="top-28 right-4 md:top-auto md:bottom-28 md:right-[12%]" sizes="(min-width: 768px) 66vw, 100vw" />
              </div>
            </div>
          </div>
          {/* mobilon a fejléc olvashatósága miatt a kép teteje elhalványul */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-ivory/90 to-transparent md:hidden" />
          <div className="wrap flex min-h-[100svh] flex-col justify-end pt-[52svh] pb-16 md:justify-center md:pt-28 md:pb-24">
            <div className="intro-rise max-w-xl">
              <p className="eyebrow">{t.hero.location}</p>
              <h1 id="hero-title" className="display mt-5 text-[clamp(3rem,9vw,6.6rem)]">
                Nyár<br />
                <em className="font-light italic text-gold-ink">Balaton</em>bogláron
              </h1>
              <p className="mt-6 max-w-md text-[1.05rem] text-ink-soft">{c.intro}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/foglalas" className="btn btn-solid">{t.hero.cta}</Link>
                <Link href="/foglalas#naptar" className="btn btn-ghost">{t.hero.secondary}</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ——— A szállás ——— */}
        <section id="szallas" aria-labelledby="stay-title" className="wrap scroll-mt-24 py-[var(--section)]">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="reveal md:col-span-5">
              <p className="eyebrow">{t.sections.stay}</p>
              <h2 id="stay-title" className="display mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)]">{property.name}</h2>
              <div className="hairline mt-8 w-32" />
            </div>
            <div className="reveal md:col-span-6 md:col-start-7">
              <p className="display text-[1.55rem] leading-snug text-ink-soft md:text-[1.8rem]">{c.story}</p>
              <ol className="mt-12 divide-y divide-line/70 border-y border-line/70">
                {c.highlights.map((h, i) => (
                  <li key={i} className="flex gap-6 py-5">
                    <span className="display w-8 shrink-0 text-xl text-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-ink-soft">{h}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ——— Galéria ——— */}
        <section id="galeria" aria-labelledby="gallery-title" className="scroll-mt-24">
          <div className="wrap">
            <div className="flex items-end justify-between gap-6">
              <h2 id="gallery-title" className="eyebrow">{t.sections.gallery}</h2>
              {gallery.length > 5 && <p className="text-xs text-muted">{gallery.length} kép</p>}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-12 md:grid-rows-[repeat(2,minmax(0,22vw))] md:gap-5">
              <figure className="reveal col-span-2 aspect-[4/3] md:col-span-7 md:row-span-2 md:aspect-auto">
                <Visual media={g(0)} label="nappali / belső tér" tone={galleryTones[0]} illustration="living" sizes="(min-width: 768px) 58vw, 100vw" />
              </figure>
              <figure className="reveal aspect-[3/4] md:col-span-5 md:aspect-auto">
                <Visual media={g(1)} label="hálószoba" tone={galleryTones[1]} illustration="bedroom" sizes="(min-width: 768px) 40vw, 50vw" />
              </figure>
              <figure className="reveal aspect-[3/4] md:col-span-5 md:aspect-auto">
                <Visual media={g(2)} label="terasz / kert" tone={galleryTones[2]} illustration="terrace" sizes="(min-width: 768px) 40vw, 50vw" />
              </figure>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-12 md:gap-5">
              <figure className="reveal col-span-2 aspect-[16/9] md:col-span-8 md:col-start-2">
                <Visual media={g(3)} label="részlet / hangulat" tone={galleryTones[3]} illustration="bath" sizes="(min-width: 768px) 66vw, 100vw" />
              </figure>
              <figure className="reveal hidden aspect-[3/4] md:col-span-3 md:block md:self-end">
                <Visual media={g(4)} label="környék / víz" tone={galleryTones[4]} illustration="lake" sizes="25vw" />
              </figure>
            </div>
            {gallery.length > 5 && (
              <ul className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" aria-label="További képek">
                {gallery.slice(5).map((m) => (
                  <li key={m.id} className="aspect-[4/5] w-[62vw] shrink-0 snap-start md:w-[22vw]">
                    <Visual media={m} label="" sizes="(min-width: 768px) 22vw, 62vw" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ——— Felszereltség ——— */}
        <section id="felszereltseg" aria-labelledby="amenities-title" className="scroll-mt-24 py-[var(--section)]">
          <div className="wrap grid gap-12 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="eyebrow">{t.sections.amenities}</p>
              <h2 id="amenities-title" className="display mt-5 text-[clamp(2rem,4vw,3.2rem)]">Minden, ami egy nyugodt nyárhoz kell</h2>
              <dl className="mt-10 space-y-3 text-sm">
                <div className="flex justify-between border-b border-line/70 pb-3"><dt className="text-muted">Bejelentkezés</dt><dd>{property.check_in_time}</dd></div>
                <div className="flex justify-between border-b border-line/70 pb-3"><dt className="text-muted">Kijelentkezés</dt><dd>{property.check_out_time}</dd></div>
              </dl>
            </div>
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 md:col-span-7 md:col-start-6">
              {c.amenities.map((group) => (
                <div key={group.group} className="reveal">
                  <h3 className="display text-2xl">{group.group}</h3>
                  <div className="hairline mt-3 mb-5 w-16" />
                  <ul className="space-y-2.5 text-ink-soft">
                    {group.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Környék ——— */}
        <section id="kornyek" aria-labelledby="area-title" className="relative scroll-mt-24 bg-sage-mist/80 py-[var(--section)]">
          <div className="wrap grid items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="eyebrow">{t.sections.area}</p>
              <h2 id="area-title" className="display mt-5 text-[clamp(2rem,4vw,3.2rem)]">A déli part csendesebb arca</h2>
              <p className="mt-6 text-ink-soft">{c.surroundings}</p>
              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5">
                {c.distances.map((d) => (
                  <div key={d.label} className="border-t border-line pt-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-muted">{d.label}</dt>
                    <dd className="display mt-1 text-xl">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="reveal md:col-span-6 md:col-start-7">
              <MapEmbed loadLabel={t.map.load} notice={t.map.notice} openLabel={t.map.open} />
            </div>
          </div>
        </section>

        {/* ——— Vendéginformációk ——— */}
        <section id="informaciok" aria-labelledby="info-title" className="wrap scroll-mt-24 py-[var(--section)]">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="eyebrow">{t.sections.info}</p>
              <h2 id="info-title" className="display mt-5 text-[clamp(2rem,4vw,3.2rem)]">Jó tudni érkezés előtt</h2>
            </div>
            <div className="md:col-span-7 md:col-start-6">
              {c.guestInfo.map((item) => (
                <details key={item.title} className="group border-b border-line/80 py-1 first:border-t">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
                    <span className="display text-2xl">{item.title}</span>
                    <span aria-hidden className="text-gold-ink transition-transform duration-500 group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-6 text-ink-soft">{item.text}</p>
                </details>
              ))}
              <details className="group border-b border-line/80 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
                  <span className="display text-2xl">Házirend és lemondás</span>
                  <span aria-hidden className="text-gold-ink transition-transform duration-500 group-open:rotate-45">+</span>
                </summary>
                <p className="pb-3 text-ink-soft">{c.houseRules}</p>
                <p className="pb-6 text-ink-soft">{c.cancellationText}</p>
              </details>
            </div>
          </div>
        </section>

        {/* ——— Foglalási felhívás ——— */}
        <section aria-labelledby="cta-title" className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-70 fade-edges">
            <Visual media={g(5) ?? cover} label="esti fény a vízen" tone="dusk" illustration="dusk" />
          </div>
          <div className="absolute inset-0 -z-10 bg-ivory/55" />
          <div className="wrap py-[var(--section)] text-center">
            <p className="eyebrow">{t.nav.book}</p>
            <h2 id="cta-title" className="display mx-auto mt-5 max-w-3xl text-[clamp(2.3rem,5vw,4.2rem)]">{t.sections.bookTitle}</h2>
            <p className="mx-auto mt-5 max-w-lg text-ink-soft">{t.sections.bookText}</p>
            <Link href="/foglalas" className="btn btn-solid mt-10">{t.hero.secondary}</Link>
          </div>
        </section>
      </main>

      {/* Mobilon mindig elérhető foglalás gomb */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-ivory/95 p-3 backdrop-blur-sm lg:hidden">
        <Link href="/foglalas" className="btn btn-solid w-full">{t.nav.book}</Link>
      </div>

      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
}
