import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { getPublicData } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Foglalás",
  description: "Szabad időpontok, azonnali árkalkuláció és közvetlen foglalás Balatonbogláron.",
  alternates: { canonical: "/foglalas" },
};

export default async function BookingPage() {
  const { property } = await getPublicData();
  return (
    <>
      <Header />
      <main id="tartalom" className="wrap pt-12 pb-10 md:pt-20">
        <p className="eyebrow">Balatonboglár</p>
        <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4.8rem)]">Foglalás</h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          Válassza ki az érkezés és a távozás napját. A szabad időpontokat és a teljes árat azonnal látja.
        </p>
        <div className="hairline mt-10 mb-12 w-40" />
        <BookingFlow bookingMode={property.booking_mode} holdMinutes={Number(process.env.BOOKING_HOLD_MINUTES ?? 15)} />
      </main>
    </>
  );
}
