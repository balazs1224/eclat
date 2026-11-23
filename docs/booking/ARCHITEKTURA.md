# Architektúra

## Áttekintés

```
Böngésző ──► Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
              ├─ nyilvános oldalak (szerveroldali renderelés)
              ├─ /api/* — elérhetőség, árajánlat, zárolás, véglegesítés, iCal, cron
              ├─ /admin — Server Actions + szerepkör-ellenőrzés
              └─ src/lib — foglalási motor, árazás, e-mail, iCal, auth
                       │
                       ▼
                 PostgreSQL 16 (egyetlen adatbázis: foglalások, árak, tartalom, képek, napló)
```

Egyetlen Node.js-alkalmazás és egyetlen PostgreSQL-adatbázis. Nincs Redis, üzenetsor vagy külön képtároló — egy szálláshoz ezek felesleges költséget és üzemeltetési terhet jelentenének.

| Réteg | Fájl |
|---|---|
| Árazás (tiszta függvény) | `booking/src/lib/booking/pricing.ts` |
| Foglalási szolgáltatás (tranzakciók) | `booking/src/lib/booking/service.ts` |
| Adatbázis-séma | `booking/db/migrations/001_init.sql` |
| iCal | `booking/src/lib/ical.ts` |
| E-mail (outbox) | `booking/src/lib/email.ts` |
| Fizetési modulhatár | `booking/src/lib/payments.ts` |
| Admin hitelesítés | `booking/src/lib/auth.ts` |
| Ütemezett feladatok | `booking/src/lib/jobs.ts` |

## Adatmodell (fő táblák)

- `properties` — szállás, alapszabályok, szerkeszthető tartalom (`content` JSON), iCal export token.
- `seasons`, `rate_overrides`, `fees`, `coupons` — árazás.
- `bookings` — foglalás; `stay` generált `daterange [érkezés, távozás)`; ár-pillanatkép (`price` JSON), előleg, befizetett összeg, zárolási és hozzáférési token **hash-e**.
- `blocks` — kézi zárolás vagy iCal-ból importált foglaltság.
- `payments` — befizetések/visszatérítések; `(provider, provider_ref)` egyedi → idempotens webhook-feldolgozás.
- `ical_feeds`, `email_outbox`, `media` (képek WebP-ben), `audit_log`.
- `admin_users`, `admin_sessions`, `login_attempts`, `rate_limits`.

## Dupla foglalás elleni védelem

Három réteg:

1. **Sorosítás**: minden foglalást érintő írás tranzakcióban, a szállás sorának zárolásával (`SELECT … FOR UPDATE`) fut. Az azonos szállásra érkező párhuzamos kérések sorban dolgozódnak fel.
2. **Ellenőrzés a tranzakción belül**: lejárt zárolások felszabadítása, majd átfedés-vizsgálat foglalásokkal és zárolásokkal.
3. **Adatbázis-szintű kényszer**: `EXCLUDE USING gist (property_id WITH =, stay WITH &&) WHERE status IN ('hold','pending','confirmed','paid')`. Ha egy kódhiba megkerülné a szolgáltatást, az adatbázis akkor sem enged átfedő aktív foglalást.

Az **időkorlátos zárolás** (`hold`, alapból 15 perc) az űrlap kitöltése alatt tartja fenn az időpontot. Lejárt zárolást minden foglalási tranzakció és az ütemezett feladat is felszabadít.

Tesztelve: 8 párhuzamos kérésből pontosan 1 kap zárolást (`tests/booking.test.ts`).

## Csatornaszinkron (Airbnb, Booking.com)

### Amit a rendszer tud

- **iCal export**: `/api/ical/<titkos-token>.ics` — minden aktív foglalás és zárolás, személyes adat nélkül. Csatornánként `?exclude=<feedId>` paraméterrel kihagyható az adott csatornából importált esemény.
- **iCal import**: külső naptár-URL-ek beolvasása 10 percenként (cron) vagy kézzel; az események zárolásként jelennek meg; a törölt események eltűnnek.
- **Ütközésjelzés**: ha egy importált foglaltság saját aktív foglalással fedi át egymást, figyelmeztetés az adminban és e-mailben.

### Késleltetés és kockázat

Az iCal **lekérdezés-alapú**, nem valós idejű:

- A mi oldalunkon az import 10 percenként fut.
- Az Airbnb és a Booking.com a saját ütemezése szerint kéri le a mi export-naptárunkat. A gyakoriságot a platformok nem garantálják; a gyakorlatban órás nagyságrendű késés is előfordulhat — **ellenőrizendő** az adott platform aktuális leírásában.
- A legrosszabb esetben a késés a két irány összege. Ezalatt ugyanaz az időszak két csatornán is eladható.
- Az iCal csak foglaltságot visz át, árat, vendégadatot, módosítást nem.

**Kockázatcsökkentés** iCal mellett: magas szezonban rövidebb időre is érdemes kézzel zárolni; a csatornákon hosszabb előidőt beállítani; az ütközésjelzést figyelni; kevés csatornát használni.

### Megbízhatóbb architektúra több csatornához

Ha a szállás több csatornán is aktívan értékesít, a központi elérhetőséget egy **channel manager** vagy **PMS** kezelje, amely a csatornákkal hivatalos partner-API-n keresztül kommunikál (közel valós idejű elérhetőség- és árszinkron). Ekkor két lehetőség van:

1. **A channel manager a „forrás”**: a weboldal foglalási motorja a channel manager API-ján keresztül foglal (ha az kínál ilyet), vagy a channel manager saját foglalómotorját ágyazzuk be.
2. **A saját motor a „forrás”**: a channel manager API-ján keresztül a mi foglalásainkat és zárolásainkat küldjük át. Ehhez a kiválasztott szolgáltató API-dokumentációja és hozzáférése szükséges.

**Nincs igazolt API-hozzáférésünk** egyik channel managerhez, az Airbnb-hez vagy a Booking.com-hoz sem. Az Airbnb és a Booking.com közvetlen API-ja jellemzően csak jóváhagyott partnereknek érhető el. Ezért a jelenlegi rendszer csak iCal-t használ, és nem állítunk valós idejű integrációt.

## Saját foglalómotor vagy kész motor beágyazása

| Szempont | Saját motor (ez a projekt) | Kész motor / channel manager beágyazása |
|---|---|---|
| Egyszeri költség | Fejlesztési idő (ez a kód) + élesítés, tartalomfeltöltés | Beállítás, arculati illesztés (általában kisebb) |
| Havi költség | Tárhely + adatbázis + e-mail-szolgáltató (kis forgalomnál alacsony) | Előfizetés (gyakran szállásonként) + esetleg foglalási jutalék — **aktuális díjak a szolgáltatónál ellenőrizendők** |
| Tranzakciós díj | Csak a választott fizetési szolgáltatóé | Fizetési szolgáltató + esetleges platformdíj |
| Csatornaszinkron | iCal (késleltetett) | Gyakran hivatalos API-kapcsolat (valós közeli) |
| Arculat, UX | Teljesen saját, Éclat-arculat | Korlátozottan testreszabható widget/iframe |
| Adatok | Saját adatbázis, teljes kontroll | A szolgáltatónál; export lehetőségtől függ |
| Üzemeltetési kockázat | Frissítések, mentések, biztonság a tulajdonos/fejlesztő felelőssége | A szolgáltató üzemelteti |
| Platformfüggőség | Alacsony | Magas (árazás, funkciók, megszűnés kockázata) |
| Bővíthetőség | Bármi hozzáfejleszthető | A szolgáltató funkcióira korlátozott |

**Javaslat**: ha a szállást elsősorban saját weboldalon és legfeljebb 1–2 csatornán hirdetik, a saját motor + iCal elegendő és olcsó. Ha 3+ csatorna és nagy forgalom várható, érdemes channel managert választani, és vagy annak motorját beágyazni, vagy (ha van API) a saját motort hozzákötni.

## Költségek (tételek, nem árajánlat)

Hivatalos árat itt nem tüntetünk fel; a tételeket a megrendelés előtt a szolgáltatónál kell ellenőrizni.

| Tétel | Jellemző megoldás | Megjegyzés |
|---|---|---|
| Domain | .hu domain regisztrátornál | éves díj |
| Tárhely | 1 kis VPS (Node + PostgreSQL + Caddy) **vagy** PaaS (pl. Vercel) + menedzselt PostgreSQL | VPS: legegyszerűbb költség; PaaS: kevesebb üzemeltetés |
| Mentés | Külső objektumtár vagy a szolgáltató mentése | napi `pg_dump` |
| E-mail | Tranzakciós e-mail-szolgáltató (SMTP) | alacsony volumennél sokszor ingyenes sáv — ellenőrizendő |
| Fizetés | Stripe / Barion / SimplePay | lásd [FIZETES.md](FIZETES.md) |
| Channel manager | csak ha szükséges | havi előfizetés |

## Biztonság

- Nincs titok a forráskódban; minden beállítás környezeti változóból (`.env.example`).
- Admin: scrypt jelszó-hash, adatbázisban tárolt munkamenet (csak hash), `httpOnly` + `SameSite=Lax` süti, sikertelen belépések korlátozása, szerepkörök, audit napló.
- Nyilvános API: zod-validáció, Origin-ellenőrzés (CSRF), IP-alapú korlát a zárolásra (IP csak sózott hash-ként tárolva), spam-csapda mező.
- Tokenek (zárolás, vendéglink, munkamenet) csak hash-ként kerülnek az adatbázisba.
- Feltöltött képek újrakódolása WebP-be, metaadatok (pl. GPS) törlése.
- CSV-injekció elleni védelem az exportban.
- Biztonsági fejlécek (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); az admin `noindex`.
