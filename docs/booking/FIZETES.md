# Online fizetés

## Jelenlegi állapot

- **Működik**: foglalás online fizetés nélkül; a fizetés módját (pl. átutalás) a visszaigazoló e-mail és a vendég foglalási oldala tartalmazza (`bankTransferInfo`, jelenleg placeholder). A befizetést az admin rögzíti, és ettől lesz a foglalás „fizetett”.
- **Integrációra vár**: Stripe, Barion vagy SimplePay. A modulhatár kész (`booking/src/lib/payments.ts`).

## Szolgáltatók összevetése

> Az alábbi díjadatok **2026. november 23-i keresés** eredményei, részben másodlagos forrásból származnak. **Nem hivatalos árajánlatok** — szerződés előtt a szolgáltató aktuális díjtáblázatában ellenőrizni kell.

| | Stripe | Barion | SimplePay (OTP Mobil) |
|---|---|---|---|
| Magyarországon | Elérhető magyar vállalkozásoknak | Magyar szolgáltató | Magyar szolgáltató (OTP-csoport) |
| Fizetőoldal | Stripe Checkout (hosted) | Barion fizetőoldal | SimplePay fizetőoldal |
| Talált díjadat | EGT-s kártyára gyakran idézett: **1,5% + 85 Ft** online; prémium EGT-kártya 1,9% + 85 Ft; nem EGT 3,25% + 85 Ft (másodlagos forrás, a Stripe 2023-as EGT-s közleményével egyező szerkezet) | 2026-os árlistára hivatkozó cikkek szerint **„Starter Fix” 1,49%** havi 5 millió Ft forgalom alatt; IC++ konstrukció is van; foglalási (reservation) funkció **+0,2%** | 2026-os kamarai promóció: **0,85%** kereskedői díj, havidíj 0 Ft 2026.12.31-ig (utána 5 000 Ft), csatlakozás 0 Ft — promóciós ajánlat |
| Megjegyzés | Kis kosárnál a fix díj számottevő | Előlegre alkalmas „Reservation” funkció | A kereskedői díj mellett költségalapú árazásnál bankközi díjak is lehetnek |

Források:
- Stripe: [stripe.com/hu/pricing](https://stripe.com/hu/pricing), [EGT árazási közlemény](https://support.stripe.com/questions/pricing-updates-for-businesses-based-in-the-european-economic-area-(eea)), [Dubsado összesítő](https://help.dubsado.com/en/articles/8901346-dubsado-payments-processing-fees)
- Barion: [barion.com/en/prices-and-conditions](https://barion.com/en/prices-and-conditions), [árkalkulátor](https://barion.com/en/business/price-calculator), [quasa.io összehasonlítás](https://quasa.io/hu/media/barion-vagy-simplepay-a-kosarertek-a-hirdetett-dijnal-fontosabb)
- SimplePay: [MKVK 2026-os tájékoztató](https://mkvk.hu/hu/letolthetoanyagok/kedvezmenyek/simplepay_online_tajekoztato_2026), [OTP SimplePay](https://www.otpbank.hu/portal/hu/kartyaelfogadas/simplepay)

**Javaslat a döntéshez**: a forintos, főleg magyar kártyás vendégkörnél a Barion vagy a SimplePay várhatóan olcsóbb; sok külföldi vendégnél és nemzetközi kártyáknál a Stripe egyszerűbb lehet. Döntés előtt érdemes a tényleges ajánlatot bekérni a várható átlagos foglalási értékkel.

## A bekötés szabályai

1. A kártyaadatot **kizárólag a szolgáltató fizetőoldala** kezeli (átirányítás). A weboldal kártyaadatot nem lát és nem tárol.
2. A foglalás **csak hitelesített visszajelzés után** kap befizetést: aláírás-ellenőrzött webhook / IPN, vagy szerveroldali státuszlekérdezés a szolgáltatótól. A böngésző visszairányítása önmagában nem bizonyíték.
3. A webhook-feldolgozás **idempotens**: a `payments (provider, provider_ref)` egyedi indexe kizárja a kétszeres rögzítést.
4. A rögzítés a meglévő `recordPayment()` függvénnyel történik, amely tranzakcióban frissíti az összeget és a státuszt.

## Teendők a bekötéshez

1. Szolgáltató kiválasztása, szerződés, teszt (sandbox) hozzáférés.
2. `PaymentProvider` implementáció: `createCheckout` (fizetés indítása), `verifyNotification` (aláírás-ellenőrzés).
3. Útvonalak: `POST /api/payments/checkout`, `POST /api/payments/webhook/<provider>`, visszatérési oldal.
4. Titkos kulcsok környezeti változóban (soha nem a kódban); a felhő fejlesztői környezetben a sandbox hostot engedélyezni kell.
5. Tesztek: sikeres, sikertelen és ismételt webhook; hamis aláírás elutasítása.
