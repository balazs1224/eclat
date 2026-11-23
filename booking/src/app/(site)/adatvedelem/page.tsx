import { LegalPage } from "@/components/site/LegalPage";
import { getPublicData } from "@/lib/public-data";
export const metadata = { title: "Adatkezelési tájékoztató" };
export default async function Page() {
  const { property } = await getPublicData();
  return <LegalPage title="Adatkezelési tájékoztató" body={property.content.privacyPolicy} />;
}
