import { LegalPage } from "@/components/site/LegalPage";
import { getPublicData } from "@/lib/public-data";
export const metadata = { title: "Foglalási feltételek" };
export default async function Page() {
  const { property } = await getPublicData();
  const c = property.content;
  return <LegalPage title="Foglalási feltételek" body={`${c.terms}\n\nLemondás:\n${c.cancellationText}\n\nHázirend:\n${c.houseRules}`} />;
}
