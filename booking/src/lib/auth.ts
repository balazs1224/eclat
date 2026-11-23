// Admin hitelesítés: scrypt jelszó-hash, adatbázisban tárolt munkamenet (csak a token hash-e),
// httpOnly + SameSite=Lax süti, bejelentkezési kísérletek korlátozása.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "./db";
import { hashIp, randomToken, sha256, verifyPassword } from "./security";
import { audit } from "./audit";

const COOKIE = "eclat_admin";
const SESSION_HOURS = 12;

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "owner" | "manager";
}

async function clientKey(email: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "local";
  return `login:${email.toLowerCase()}:${hashIp(ip)}`;
}

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = await clientKey(email);
  const recent = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM login_attempts WHERE key = $1 AND at > now() - interval '15 minutes'",
    [key],
  );
  if ((recent?.n ?? 0) >= 5) return { ok: false, message: "Túl sok sikertelen próbálkozás. Próbálja újra 15 perc múlva." };

  const user = await queryOne<AdminUser & { password_hash: string }>(
    "SELECT id, email, name, role, password_hash FROM admin_users WHERE email = lower($1)",
    [email],
  );
  // időzítés-kiegyenlítés: nem létező felhasználónál is fut a hash-ellenőrzés
  const valid = await verifyPassword(password, user?.password_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !valid) {
    await query("INSERT INTO login_attempts (key) VALUES ($1)", [key]);
    return { ok: false, message: "Hibás e-mail-cím vagy jelszó." };
  }
  const token = randomToken();
  await query(
    "INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(hours => $3))",
    [sha256(token), user.id, SESSION_HOURS],
  );
  await query("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [user.id]);
  await query("DELETE FROM admin_sessions WHERE expires_at < now()");
  await audit(undefined, user.email, "admin.login", "admin_user", user.id);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return queryOne<AdminUser>(
    `SELECT u.id, u.email, u.name, u.role FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
}

export async function requireAdmin(role?: "owner"): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  if (role === "owner" && user.role !== "owner") redirect("/admin?err=Ehhez%20tulajdonosi%20jogosults%C3%A1g%20sz%C3%BCks%C3%A9ges");
  return user;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM admin_sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}

/** Vendégadatok maszkolása a nem tulajdonosi szerepkörnek (GDPR: szükségesség elve). */
export function maskEmail(email: string | null, user: AdminUser): string {
  if (!email) return "—";
  if (user.role === "owner") return email;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

export function maskPhone(phone: string | null, user: AdminUser): string {
  if (!phone) return "—";
  if (user.role === "owner") return phone;
  return `${phone.slice(0, 3)} *** ${phone.slice(-2)}`;
}
