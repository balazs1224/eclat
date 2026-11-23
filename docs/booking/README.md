# Éclat Balatonboglár — foglalási rendszer

Saját domainre szánt, magyar nyelvű szállásfoglaló weboldal és adminfelület egy balatonboglári nyári szálláshoz.
Az alkalmazás a [`booking/`](../../booking) mappában van.

| Dokumentum | Tartalom |
|---|---|
| [SPECIFIKACIO.md](SPECIFIKACIO.md) | Funkcionális specifikáció, foglalási folyamat, státuszok |
| [ARCHITEKTURA.md](ARCHITEKTURA.md) | Architektúra, adatmodell, foglalási logika, csatornaszinkron, saját vs. kész motor, költségek |
| [FIZETES.md](FIZETES.md) | Stripe / Barion / SimplePay összevetés, a fizetési modul bekötése |
| [JOGI-ELLENORZES.md](JOGI-ELLENORZES.md) | NTAK, VIZA, GDPR, számlázás, IFA — ellenőrizendő pontok |
| [TELEPITES.md](TELEPITES.md) | Helyi fejlesztés, éles telepítés, cron, mentés és visszaállítás, élesítési lista |

## Mi kész, mi demó, mi vár integrációra

| Terület | Állapot | Megjegyzés |
|---|---|---|
| Foglalási motor (elérhetőség, árazás, zárolás, státuszok) | **Kész** | Szerveroldali ellenőrzés, tranzakció + adatbázis-szintű átfedés-tiltás, 40 automatikus teszt |
| Interaktív foglalási naptár, árkalkuláció, foglalási űrlap | **Kész** | Mobilbarát, billentyűzettel kezelhető |
| Szezonális / hétvégi / ünnepnapi / egyedi árak, min. éjszaka, kupon, takarítási díj, extra költségek | **Kész** | |
| Előleg vagy teljes fizetés számítása, lemondási szabályok | **Kész** | A visszatérítést a rendszer kiszámolja, de nem utalja |
| Adminfelület (foglalások, naptár, zárolás, árak, tartalom, képek, kimutatások, CSV) | **Kész** | Jelszóval védett, két szerepkör |
| iCal export és import, ütközésjelzés | **Kész** | Nem valós idejű — lásd ARCHITEKTURA.md |
| E-mail értesítések | **Kész, élesítésre vár** | Alapból csak naplóz (`EMAIL_DRIVER=outbox`); SMTP-szolgáltató beállítása szükséges |
| Árak, vendégszám, szabályok | **Demó** | Minden ár „DEMÓ” jelölésű; a weboldal bemutató-sávot mutat, amíg ilyen adat van |
| Szövegek, fotók, elérhetőségek, jogi szövegek | **Placeholder** | `[PLACEHOLDER: …]` jelöléssel; az adminban cserélhető |
| Online fizetés (Stripe / Barion / SimplePay) | **Integrációra vár** | A modulhatár kész (`src/lib/payments.ts`); szolgáltatóválasztás után köthető be |
| Airbnb / Booking.com API-integráció, channel manager | **Nincs** | Nincs igazolt API-hozzáférés; csak iCal |
| NTAK-adatszolgáltatás, VIZA, számlázás | **Nem része** | Külön, erre alkalmas rendszerben kell végezni — lásd JOGI-ELLENORZES.md |
| Angol és német nyelv | **Előkészítve** | Szótár-szerkezet kész (`src/i18n/hu.ts`), fordítás és útvonalak még nincsenek |

## Nyitott kérdések a tulajdonos felé

- Szállás neve, pontos címe, férőhely, hálószobák/ágyak, felszereltség, fotók.
- Valós árak, szezonhatárok, minimum éjszakák, takarítási díj, extra vendég díja, kaució.
- Foglalási folyamat: igény + jóváhagyás (jelenlegi alapbeállítás) vagy azonnali foglalás.
- Előleg mértéke és határideje, lemondási feltételek, fizetési mód (átutalás? online?).
- Meglévő hirdetések (Airbnb, Booking.com), channel manager használata.
- Üzemeltetői adatok (magánszemély / vállalkozás), NTAK-szám, számlázó program, adatkezelési tájékoztató.
- Domain, e-mail-cím, értesítési cím.
