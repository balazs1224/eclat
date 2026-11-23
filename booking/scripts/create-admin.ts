import "./load-env";
import pg from "pg";
import { hashPassword } from "../src/lib/security";

// Használat: npm run admin:create -- <email> "<név>" [owner|manager]
// A jelszót az ADMIN_PASSWORD környezeti változóból olvassa (így nem kerül a shell-előzménybe paraméterként).
async function main() {
  const [email, name, role = "owner"] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) {
    console.error('Használat: ADMIN_PASSWORD=... npm run admin:create -- <email> "<név>" [owner|manager]');
    process.exit(1);
  }
  if (password.length < 12) throw new Error("A jelszó legalább 12 karakter legyen.");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO admin_users (email, name, password_hash, role) VALUES (lower($1), $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [email, name, await hashPassword(password), role],
  );
  await client.end();
  console.log(`Admin felhasználó mentve: ${email} (${role})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
