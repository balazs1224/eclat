import { LegalPage } from "@/components/site/LegalPage";
import { getPublicData } from "@/lib/public-data";
export const metadata = { title: "Impresszum" };
export default async function Page() {
  const { property } = await getPublicData();
  const c = property.content;
  return (
    <LegalPage
      title="Impresszum"
      body={`Szálláshely: ${property.name}\nCím: ${c.address}\nNTAK regisztrációs szám: ${c.ntakNumber}\nE-mail: ${c.contactEmail}\nTelefon: ${c.contactPhone}\n\n[PLACEHOLDER: üzemeltető neve, adószám / nyilvántartási adatok — ellenőrzendő, milyen adatok kötelezőek]`}
    />
  );
}
