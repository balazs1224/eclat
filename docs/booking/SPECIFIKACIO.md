# Funkcionális specifikáció

## Célok

- A vendég közvetítő nélkül, a saját weboldalon foglalhasson.
- Egy időszakot ne lehessen két vendégnek eladni.
- A tulajdonos technikai tudás nélkül kezelje a foglalásokat, árakat, tartalmat.
- Egy szállásra optimalizált, de az adatmodell több szállást is kezel (`property_id` minden táblában).

## Nyilvános weboldal

| Oldal | Tartalom |
|---|---|
| `/` | Borítókép, bemutatkozás, galéria, felszereltség, környék + térkép (kattintásra töltődő OpenStreetMap), vendéginformációk, foglalási felhívás; mobilon állandó „Foglalás” gomb |
| `/foglalas` | Interaktív naptár, vendégszám, kupon, élő árkalkuláció, foglalási adatok |
| `/foglalas/<azonosító>?t=<token>` | A vendég saját foglalása (csak a titkos linkkel érhető el) |
| `/feltetelek`, `/adatvedelem`, `/impresszum` | Jogi szövegek (placeholder) |

SEO: szerveroldali renderelés, meta- és Open Graph-adatok, `sitemap.xml`, `robots.txt`, strukturált adat (`LodgingBusiness`) — ez utóbbi csak akkor jelenik meg, ha a szállás neve már nem placeholder.

## Foglalási folyamat

1. **Időpont kiválasztása.** A naptár a szerverről kapja a foglalt éjszakákat és a minimum éjszakaszámokat. A távozás napja szabad lehet (az aznapi éjszaka nem foglalt), így csatlakozó foglalások lehetségesek.
2. **Vendégszám és kupon.** Az ár azonnal frissül (`POST /api/quote`): éjszakánkénti díjak, extra vendég, további költségek, kedvezmény, végösszeg, előleg, hátralék esedékessége.
3. **Zárolás.** „Tovább” gombra a szerver tranzakcióban újraellenőriz és **15 perces zárolást** (`hold`) hoz létre. Ez alatt más nem foglalhatja ugyanazt az időszakot. Visszalépéskor a zárolás azonnal feloldódik.
4. **Adatok megadása.** Név, e-mail, telefon, ország, üzenet; adatkezelési és foglalási feltételek elfogadása (kötelező); rejtett spam-csapda mező.
5. **Véglegesítés.** A beállítástól függően:
   - *Foglalási igény* (alapértelmezett): státusz **függőben**, a tulajdonos jóváhagyja.
   - *Azonnali foglalás*: státusz **visszaigazolt**.
6. **Értesítések.** Vendég: visszaigazolás / igény beérkezése; tulajdonos: új foglalás. A vendég e-mailben kapja a saját foglalása linkjét.

## Státuszok

| Státusz | Jelentés | Átmenet |
|---|---|---|
| `hold` (belső) | Űrlap kitöltése alatti zárolás | → függőben / visszaigazolt; → lejárt |
| `pending` — függőben | Igény beérkezett | → visszaigazolt (admin), → lemondott; befizetéskor automatikusan visszaigazolt |
| `confirmed` — visszaigazolt | Foglalás érvényes | → fizetett (ha a befizetés eléri a végösszeget), → lemondott |
| `paid` — fizetett | Teljes összeg befizetve | → lemondott |
| `cancelled` — lemondott | Az időszak felszabadul | visszatérítés rögzíthető |
| `expired` (belső) | Lejárt zárolás | — |

A befizetés állapota külön is követett (`amount_paid`), így látszik az „előleg fizetve, hátralék nyitott” helyzet.

## Árazási szabályok

- Éjszakadíj elsőbbsége: **egyedi nap** (ünnepnap / egyedi ár) → **szezon** (átfedésnél a nagyobb prioritás) → **alapár**.
- **Hétvégi ár**: a szezon hétvégi díja a beállított éjszakákon (alapból péntek és szombat éjszaka).
- **Minimum éjszaka**: az érkezés napjára érvényes szabály (egyedi nap → szezon → alapérték).
- **Extra vendég**: az alapárban foglalt létszám felett fő/éjszaka díj.
- **További költségek**: tartózkodásonként (pl. takarítás), éjszakánként, vendég/éjszaka (pl. idegenforgalmi adó, ha így kezelendő).
- **Kupon**: százalékos vagy fix; érvényesség az érkezés napjára, min. éjszaka, felhasználási limit. Csak a szállásdíjra vonatkozik.
- **Előleg**: a végösszeg beállított %-a; ha az érkezés a hátralék-határidőn belül van, a teljes összeg fizetendő.
- **Foglalási ablak**: legalább X, legfeljebb Y nappal előre.
- Minden összeg egész forint.

## Adminfelület (`/admin`)

- **Áttekintés**: függő igények, 30 napos foglaltság, idei érték, befizetések, kintlévőség, közelgő érkezések, szinkronhibák.
- **Foglalások**: lista szűrőkkel (mobilon kártyanézet), részletek, jóváhagyás, módosítás (ütközésellenőrzéssel, kézi végösszeggel), lemondás (visszatérítési javaslat a szabályok szerint), befizetés és visszatérítés rögzítése, belső megjegyzés, előzmények (audit napló), CSV export (Excel-barát, `;` elválasztó, UTF-8 BOM).
- **Kézi foglalás**: telefonos/e-mailes foglalás rögzítése; min. éjszaka nem kötelező.
- **Naptár és zárolás**: havi nézet foglalásokkal és zárolásokkal; időszak zárolása/feloldása.
- **Árak és szabályok**: alapszabályok, szezonok, egyedi napok, költségtételek, kuponok.
- **Szállás és képek**: minden weboldal-szöveg és jogi szöveg; képfeltöltés (WebP-re alakítás, metaadat-törlés), borítókép, sorrend, alternatív szöveg.
- **Naptárszinkron**: iCal export-link(ek), külső naptárak importja, kézi szinkron.
- **E-mailek**: kiküldött/naplózott levelek, újraküldés.
- **Kimutatások**: havi foglaltság, foglalásszám, éjszakák, érték, befizetés, forrás.

### Jogosultságok

| Szerepkör | Jogok |
|---|---|
| `owner` — tulajdonos | Minden, vendégadatok teljes egészében |
| `manager` — kezelő | Foglalások kezelése, zárolás, szinkron; vendég e-mail és telefon maszkolva; árak és tartalom csak olvasható |

## Nem része a rendszernek

NTAK-adatszolgáltatás, VIZA vendégregisztráció, számlázás, idegenforgalmi adó bevallása — ezekhez külön, erre alkalmas rendszer kell (lásd [JOGI-ELLENORZES.md](JOGI-ELLENORZES.md)).
