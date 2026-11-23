# Telepítés és üzemeltetés

## Helyi fejlesztés

Követelmények: Node.js 20.9+ (tesztelve 22-vel), PostgreSQL 14+ (tesztelve 16-tal), `btree_gist` bővítmény (a PostgreSQL része).

```bash
cd booking
cp .env.example .env            # töltsd ki: APP_SECRET, CRON_SECRET (openssl rand -hex 32)
npm ci
npm run db:migrate              # séma
npm run db:seed                 # szállás DEMÓ árakkal és PLACEHOLDER tartalommal
ADMIN_PASSWORD='legalább-12-karakter' npm run admin:create -- tulaj@example.com "Tulajdonos" owner
npm run dev                     # http://localhost:3000, admin: /admin
```

Tesztek (külön adatbázison — a tartalmát törlik!):

```bash
TEST_DATABASE_URL=postgresql://booking:booking@localhost:5432/booking_test npm test
npm run typecheck
npm run build
```

## Környezeti változók

| Változó | Kötelező | Leírás |
|---|---|---|
| `DATABASE_URL` | igen | PostgreSQL kapcsolat |
| `APP_URL` | igen | Nyilvános cím (e-mail-linkek, sitemap, iCal) — **build előtt is** legyen beállítva |
| `APP_SECRET` | igen | Hosszú véletlen titok |
| `CRON_SECRET` | igen | `/api/cron` hívásához |
| `EMAIL_DRIVER` | | `outbox` (csak naplóz) vagy `smtp` |
| `EMAIL_FROM`, `EMAIL_ADMIN_TO` | élesben | Feladó, értesítési cím |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | `smtp` esetén | E-mail-szolgáltató |
| `BOOKING_HOLD_MINUTES` | | Zárolás hossza (alap: 15) |
| `PAYMENT_PROVIDER` | | Jelenleg csak `manual` |

Titkot soha ne tegyél a kódba vagy a verziókezelőbe (`.env` a `.gitignore`-ban van).

## Éles telepítés — javasolt egyszerű felállás (1 VPS)

> Az alábbi lépések szokásos, de **ebben a projektben még nem éles környezetben tesztelt** eljárást írnak le.

1. EU-s VPS (pl. Ubuntu LTS), tűzfal: csak 22, 80, 443.
2. Telepítés: Node.js LTS, PostgreSQL, [Caddy](https://caddyserver.com/) (automatikus HTTPS).
3. Adatbázis és felhasználó létrehozása; `DATABASE_URL` beállítása.
4. Alkalmazás: `git clone`, `cd booking && npm ci && npm run db:migrate && npm run db:seed && npm run build`.
5. Folyamatkezelés: systemd szolgáltatás `npm run start` (port 3000), `EnvironmentFile=/etc/eclat-booking.env`.
6. Caddy: `example.hu { reverse_proxy localhost:3000 }`.
7. Ütemezett feladat (systemd timer vagy cron, 5 percenként):
   `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://example.hu/api/cron`
   (lejárt zárolások, iCal-import, e-mail-kézbesítés újrapróbálása).
8. Admin felhasználó létrehozása az `admin:create` szkripttel.

Alternatíva: PaaS (pl. Vercel) + menedzselt PostgreSQL. Ekkor a cront a platform ütemezője hívja; a képek az adatbázisban vannak, így nem kell külön fájltár.

## Mentés és visszaállítás

Minden adat (képek is) egyetlen PostgreSQL-adatbázisban van.

```bash
# napi mentés (cron), 30 nap megőrzés, külső tárhelyre másolva
pg_dump --format=custom --file=/var/backups/eclat-$(date +%F).dump "$DATABASE_URL"

# visszaállítás üres adatbázisba
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" /var/backups/eclat-2027-06-01.dump
```

- A mentést **titkosítva, másik helyre** is másold (pl. objektumtárba).
- Negyedévente próbáld ki a visszaállítást egy teszt-adatbázisba.
- Menedzselt adatbázisnál kapcsold be a szolgáltató pont-időre visszaállítását is.

## Naplózás és felügyelet

- Alkalmazásnapló: a folyamat stdout/stderr kimenete (systemd journal / platform napló).
- Üzleti napló: `audit_log` tábla (belépések, foglalási műveletek, export, beállítások).
- E-mail kézbesítés: admin → E-mailek.
- Szinkronhibák és ütközések: admin → Áttekintés.
- Javasolt külső rendelkezésre állás-figyelő a főoldalra és az `/api/availability` végpontra.

## Élesítési ellenőrzőlista

- [ ] Minden `[PLACEHOLDER]` cserélve jóváhagyott tartalomra; fotók feltöltve, alternatív szöveggel.
- [ ] Minden „DEMÓ” ár és szezon cserélve valós adatra (ekkor eltűnik a bemutató-sáv).
- [ ] Foglalási folyamat (igény/azonnali), előleg, lemondási szabályok véglegesítve.
- [ ] Adatkezelési tájékoztató, foglalási feltételek, impresszum jogász által jóváhagyva.
- [ ] NTAK / VIZA / számlázás / IFA kérdései tisztázva (lásd JOGI-ELLENORZES.md).
- [ ] `EMAIL_DRIVER=smtp`, SPF/DKIM beállítva a domainhez, tesztlevél megérkezett.
- [ ] `APP_URL` az éles domain; HTTPS működik.
- [ ] Erős admin jelszó; a demó admin felhasználó törölve.
- [ ] Cron fut; napi mentés fut; visszaállítás kipróbálva.
- [ ] iCal export link megadva a csatornákon; importált naptárak „rendben” státuszúak.
- [ ] Teljes foglalás végigpróbálva mobilon és asztali gépen.
