// Saját, a szállás moodboardjából merített hangulati illusztrációk (scripts/illustrations/).
// Akkor jelennek meg, amíg az adott helyre nincs feltöltött valós fotó. NEM a szállást ábrázolják.
export const ILLUSTRATIONS = {
  salon: { w: 2000, h: 1500, alt: "Illusztráció: lambériás fal tájképes tapétával, íves aranyozott tükör, zsályazöld komód hortenziával" },
  living: { w: 1867, h: 1400, alt: "Illusztráció: íves francia ablak függönyökkel, csillár, kerek asztal virággal" },
  bedroom: { w: 1333, h: 1667, pos: "50% 72%", alt: "Illusztráció: kárpitozott ágytámla, mintás tapétás falpanelek, éjjeliszekrény lámpával" },
  terrace: { w: 1333, h: 1667, pos: "50% 62%", alt: "Illusztráció: rózsás lugas, bisztróasztal, cserepes hortenziák, kilátás a vízre" },
  bath: { w: 2000, h: 1125, alt: "Illusztráció: ovális aranyozott tükör virágágas tapétán, sárgaréz falikarok, zsályazöld mosdószekrény" },
  lake: { w: 1333, h: 1667, pos: "50% 55%", alt: "Illusztráció: balatoni part náddal, stéggel és vitorlásokkal" },
  dusk: { w: 2000, h: 1125, alt: "Illusztráció: esti fény a vízen, nád és vitorlás" },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
