# Claude skillek és eszközök az oldal fejlesztéséhez

Cél: minden munkamenet ugyanazzal a minőséggel, kevesebb újramagyarázással dolgozzon az Éclat balatoni oldalon.

## 1. Már elérhető — használd rendszeresen

| Skill / eszköz | Mire | Mikor hívd |
|---|---|---|
| `design:design-critique` | Strukturált vizuális visszajelzés (hierarchia, ritmus, következetesség) | Minden nagyobb UI-változás után, képernyőképekkel |
| `design:accessibility-review` | WCAG 2.1 AA ellenőrzés: kontraszt, billentyűzet, érintési méret, képernyőolvasó | Élesítés előtt; a foglalási naptárnál és űrlapnál kötelező |
| `design:design-system` | Tokenek és komponensek auditja, eltérések keresése | Ha új szín/komponens kerül be (pl. a moodboard-paletta) |
| `design:ux-copy` | Mikroszövegek, hibaüzenetek, gombfeliratok | A foglalási folyamat és az admin szövegeinél |
| `design:design-handoff` | Fejlesztői specifikáció egy tervből | Ha Figmában készül terv |
| `run` | Az alkalmazás elindítása és kipróbálása | Minden változtatás után, „működik-e” ellenőrzésre |
| `code-review` | Hibakeresés a változtatásokban | Commit / pull request előtt |
| `security-review` | Biztonsági átnézés | Fizetés, admin, API változásakor kötelező |
| `simplify` | Kódtisztítás, duplikáció csökkentése | Nagyobb funkció lezárásakor |
| `artifact-design` | Megosztható oldal / prezentáció | Ha a tulajdonosnak bemutatót kell küldeni |
| Graphify (`/graphify . --update`) | Kódgráf a gyors tájékozódáshoz (CLAUDE.md előírja) | Szerkezeti változás után |
| Mobbin MCP | Valós appok képernyő- és folyamatmintái (pl. foglalási naptárak) | UX-minták kereséséhez |

## 2. Csatlakozó, amely most nem működik

- **Figma** — a felhő környezet hálózata nem engedi a Figma hostját, ezért nem csatlakozott. Ha Figmában terveztek, a környezet hálózati beállításaiban engedélyezni kell (ezt Claude kérésre javasolja; jóváhagyás nélkül nem változik).

## 3. Érdemes létrehozni — projektspecifikus skillek

Ezek a `skill-creator` skillel készíthetők el, és a repóban (`.claude/skills/`) tárolhatók, így minden munkamenet megkapja őket.

| Javasolt skill | Tartalom | Miért |
|---|---|---|
| `eclat-brand` | Design tokenek, tipográfia, moodboard-motívumok, „mit kerülj” lista, a PLACEHOLDER-szabály, képjelölési szabály | Egységes arculat; nem talál ki tényeket |
| `booking-rules` | Árazási és foglalási szabályok összefoglalója, státuszgép, a tesztek futtatása, „nincs dupla foglalás” garanciák | Biztonságos módosítás a foglalási motoron |
| `visual-qa` | Playwright-szkript: asztali + mobil képernyőképek a fő oldalakról, konzolhiba- és túlcsordulás-ellenőrzés, csökkentett mozgás | Minden UI-változás után ugyanaz az ellenőrzés |
| `content-intake` | Űrlap / ellenőrzőlista a tulajdonostól kapott valós adatok (fotók, árak, szövegek, jogi adatok) betöltéséhez az adminba | A placeholderek biztonságos cseréje |
| `release-checklist` | A TELEPITES.md élesítési listája végrehajtható lépésekként (build, migráció, mentés, SMTP-teszt) | Hibamentes élesítés |
| `illustrations` | A `scripts/illustrations/` generátor használata, új jelenet hozzáadása, raszterizálás | Új hangulatképek gyors készítése, amíg nincs fotó |

## 4. Amit egy skill nem pótol

- **Valós fotók** a szállásról (szakmai fotós ajánlott; vízszintes és álló képarány is kell).
- Jóváhagyott szövegek, árak, jogi szövegek a tulajdonostól / szakértőtől.
