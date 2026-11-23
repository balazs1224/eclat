# Magyarországi működés — ellenőrizendő pontok

> **Ez nem jogi tanácsadás.** Az alábbi lista azokat a területeket gyűjti össze, amelyeket élesítés előtt szakemberrel (könyvelő, jogász, a helyi önkormányzat) ellenőrizni kell. Minden pont **ellenőrizendő**; a pontos kötelezettség a szálláshely típusától (pl. magánszálláshely vagy egyéb szálláshely), az üzemeltető formájától és az aktuális jogszabályoktól függ.

## Mit végez a foglalási rendszer, és mit nem

| Feladat | Foglalási rendszer | Külön rendszer / teendő |
|---|---|---|
| Elérhetőség, ár, foglalás, visszaigazolás | ✔ | |
| Vendég elérhetőségeinek tárolása a foglaláshoz | ✔ | |
| NTAK-adatszolgáltatás | ✘ | NTAK-kompatibilis szálláshely-kezelő szoftver — **ellenőrizendő** |
| Vendégregisztráció (VIZA) | ✘ | A jogszabály szerinti rendszer — **ellenőrizendő** |
| Számla kiállítása | ✘ | Számlázó program (NAV Online Számla kapcsolattal) — **ellenőrizendő** |
| Idegenforgalmi adó (IFA) nyilvántartás, bevallás | ✘ (csak díjtételként számolható) | Önkormányzat felé — **ellenőrizendő** |

## NTAK

- Ellenőrizendő: a szálláshely regisztrációs kötelezettsége és az NTAK-ba történő adatszolgáltatás módja (jellemzően tanúsított szálláshely-kezelő szoftveren keresztül).
- Ellenőrizendő: van-e a tulajdonosnak már ilyen szoftvere, és az tud-e iCal-t vagy API-t, amelyhez a foglalási rendszer kapcsolódhat.
- A foglalási rendszer **nem végez NTAK-adatszolgáltatást**, és nem állítjuk, hogy NTAK-kompatibilis.
- Az NTAK regisztrációs szám helye a lábléc és az impresszum (`[PLACEHOLDER]`).

## VIZA (vendégregisztráció)

- Ellenőrizendő: vonatkozik-e a szálláshelyre a vendégek okmányainak rögzítése és a VIZA-ba továbbítása, és ha igen, milyen eszközzel (a szabályozás az elmúlt években többször változott).
- A foglalási rendszer **nem gyűjt okmányadatot**, és nem is kell gyűjtenie a foglaláshoz.

## Számlázás és adózás

- Ellenőrizendő a könyvelővel: az üzemeltetés formája (magánszemély / egyéni vállalkozó / cég), az áfakör, a számlázási kötelezettség, a NAV-adatszolgáltatás.
- A rendszer a befizetéseket nyilvántartja, de **számlát nem állít ki**. Számlázó program bekötése (pl. API-n) későbbi bővítés lehet.
- Az előleg és a lemondási díj számviteli kezelése — ellenőrizendő.

## Idegenforgalmi adó (IFA)

- Az IFA összegét és a mentességeket a település (Balatonboglár) önkormányzati rendelete határozza meg — **ellenőrizendő**.
- A rendszerben „vendég/éjszaka” díjtételként rögzíthető (a seedben inaktív, 0 Ft-os placeholder). Ha a mentességek (pl. életkor) miatt nem minden vendégre vonatkozik, a számítást ennek megfelelően pontosítani kell.

## GDPR / adatvédelem

A rendszer kialakítása az adattakarékosság elvét követi:

- Csak a foglaláshoz szükséges adatok: név, e-mail, telefon, ország, opcionális üzenet.
- Az adatkezelési tájékoztató elfogadásának időpontja rögzül.
- IP-cím nem tárolódik nyersen (csak titokkal sózott hash, visszaélés-korlátozáshoz).
- Kezelői szerepkörnél a vendég elérhetőségei maszkolva jelennek meg; az exportot és a műveleteket audit napló rögzíti.
- Az iCal export személyes adatot nem tartalmaz.
- A térkép csak kattintásra tölt be külső tartalmat (OpenStreetMap), előtte tájékoztat.
- Saját betűtípusok (nincs Google Fonts hívás a látogató böngészőjéből).

Élesítés előtt elkészítendő / ellenőrizendő:

- Adatkezelési tájékoztató (adatkezelő, cél, jogalap, megőrzési idő, adatfeldolgozók: tárhely, e-mail-szolgáltató, fizetési szolgáltató, érintetti jogok).
- Adatfeldolgozói szerződések a szolgáltatókkal.
- Megőrzési idő meghatározása és a régi foglalások anonimizálása (a rendszerben még nincs automatikus törlés — **teendő**).
- Sütik: a nyilvános oldal jelenleg nem használ követő sütit; az admin csak munkamenet-sütit. Analitika bevezetése esetén hozzájárulás-kezelés kell.
- Foglalási feltételek / ÁSZF (távollevők között kötött szerződésre vonatkozó tájékoztatás) — jogásszal véglegesítendő.
