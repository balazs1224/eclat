import { Footer } from "@/components/site/Footer";
import { getPublicData, isPlaceholder } from "@/lib/public-data";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { property } = await getPublicData();
  // Bemutató-jelzés, amíg DEMÓ ár vagy PLACEHOLDER név van a rendszerben — nehogy valós ajánlatnak tűnjön.
  const demo = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM seasons WHERE property_id = $1 AND name LIKE '%DEMÓ%'",
    [property.id],
  );
  const showNotice = isPlaceholder(property.name) || (demo?.n ?? 0) > 0;
  return (
    <>
      {showNotice && (
        <div role="note" className="relative z-50 bg-ink px-4 py-2 text-center text-[0.7rem] tracking-[0.08em] text-ivory/85">
          Bemutató változat — az árak DEMÓ értékek, a [PLACEHOLDER] jelölésű tartalmak jóváhagyásra várnak.
        </div>
      )}
      {children}
      <Footer property={property} />
    </>
  );
}
