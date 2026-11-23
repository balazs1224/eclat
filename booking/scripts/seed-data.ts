// Kezdő adatok. MINDEN ár és szabály DEMÓ érték, és minden tényadat PLACEHOLDER,
// amíg a tulajdonos nem adja meg a valós adatokat (az admin felületen módosítható).
import type { PropertyContent } from "../src/lib/property";

export const PLACEHOLDER_CONTENT: PropertyContent = {
  tagline: "Nyári szállás Balatonbogláron",
  intro: "[PLACEHOLDER: rövid, személyes bemutatkozás — 2–3 mondat a szállásról és a vendéglátókról]",
  story: "[PLACEHOLDER: hosszabb bemutatkozó szöveg — a ház hangulata, története, kinek ajánljuk]",
  highlights: [
    "[PLACEHOLDER: kiemelt jellemző 1 — pl. a víztől mért távolság]",
    "[PLACEHOLDER: kiemelt jellemző 2]",
    "[PLACEHOLDER: kiemelt jellemző 3]",
  ],
  amenities: [
    { group: "Hálószobák és fürdő", items: ["[PLACEHOLDER: hálószobák száma és ágyak]", "[PLACEHOLDER: fürdőszoba]"] },
    { group: "Konyha és étkezés", items: ["[PLACEHOLDER: konyhai felszereltség]"] },
    { group: "Kert és szabadtér", items: ["[PLACEHOLDER: terasz / kert / grill]"] },
    { group: "Kényelem", items: ["[PLACEHOLDER: klíma, wifi, parkolás stb. — csak a valóban meglévők]"] },
  ],
  surroundings:
    "A szállás Balatonbogláron, a Balaton déli partján található. [PLACEHOLDER: a környék személyes bemutatása — strand, programok, kedvenc helyek]",
  distances: [
    { label: "Strand", value: "[PLACEHOLDER]" },
    { label: "Vasútállomás", value: "[PLACEHOLDER]" },
    { label: "Bolt", value: "[PLACEHOLDER]" },
    { label: "Étterem", value: "[PLACEHOLDER]" },
  ],
  guestInfo: [
    { title: "Érkezés és távozás", text: "[PLACEHOLDER: bejelentkezés módja, kulcsátadás]" },
    { title: "Parkolás", text: "[PLACEHOLDER: parkolási lehetőség]" },
    { title: "Háziállat", text: "[PLACEHOLDER: háziállat-szabályzat]" },
    { title: "Idegenforgalmi adó", text: "[PLACEHOLDER: az IFA összege és kezelése — önkormányzati rendelet alapján ellenőrizendő]" },
  ],
  houseRules: "[PLACEHOLDER: házirend]",
  cancellationText: "[PLACEHOLDER: lemondási feltételek jóváhagyott szövege — a DEMÓ szabály: 30 napig 100%, 14 napig 50% visszatérítés]",
  privacyPolicy: "[PLACEHOLDER: adatkezelési tájékoztató — jogi szakértővel véglegesítendő]",
  terms: "[PLACEHOLDER: általános szerződési / foglalási feltételek — jogi szakértővel véglegesítendő]",
  contactEmail: "[PLACEHOLDER: kapcsolati e-mail]",
  contactPhone: "[PLACEHOLDER: telefonszám]",
  address: "[PLACEHOLDER: pontos cím], Balatonboglár",
  ntakNumber: "[PLACEHOLDER: NTAK regisztrációs szám]",
  bankTransferInfo: "[PLACEHOLDER: kedvezményezett neve, bankszámlaszám, közlemény: foglalási azonosító]",
};

export function demoSeasons(year: number) {
  return [
    { name: `Előszezon ${year} (DEMÓ ár)`, start: `${year}-05-01`, end: `${year}-06-19`, rate: 38000, weekend: 44000, min: 2, priority: 0 },
    { name: `Főszezon ${year} (DEMÓ ár)`, start: `${year}-06-20`, end: `${year}-08-23`, rate: 62000, weekend: 68000, min: 5, priority: 10 },
    { name: `Utószezon ${year} (DEMÓ ár)`, start: `${year}-08-24`, end: `${year}-09-30`, rate: 40000, weekend: 46000, min: 2, priority: 0 },
  ];
}
