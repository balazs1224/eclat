# Éclat Balatonboglár — foglalási rendszer

Next.js 16 + TypeScript + Tailwind CSS 4 + PostgreSQL. Részletes dokumentáció: [`../docs/booking/`](../docs/booking/README.md).

```bash
cp .env.example .env     # APP_SECRET, CRON_SECRET kitöltése
npm ci
npm run db:migrate && npm run db:seed
ADMIN_PASSWORD='legalább-12-karakter' npm run admin:create -- admin@example.com "Admin" owner
npm run dev              # http://localhost:3000 · admin: /admin
npm test                 # árazási és foglalási tesztek (TEST_DATABASE_URL adatbázist TÖRLI)
```

| Mappa | Tartalom |
|---|---|
| `src/lib/booking/` | Árazási motor (tiszta függvény) és tranzakciós foglalási szolgáltatás |
| `src/app/(site)/` | Nyilvános oldalak |
| `src/app/api/` | Elérhetőség, árajánlat, zárolás, véglegesítés, iCal, cron |
| `src/app/admin/` | Adminfelület (Server Actions) |
| `db/migrations/` | SQL séma |
| `scripts/` | Migráció, seed (DEMÓ/PLACEHOLDER adatok), admin létrehozás, ütemezett feladatok |
| `scripts/illustrations/` | Hangulati illusztrációk generátora: `python3 scripts/illustrations/scenes.py && node scripts/illustrations/rasterize.mjs` |
| `tests/` | Vitest: árazás (egység) és foglalás (valódi PostgreSQL) |
