import { currentAdmin, maskEmail, maskPhone } from "@/lib/auth";
import { getProperty } from "@/lib/property";
import { listBookings } from "@/lib/admin-queries";
import { STATUS_LABELS } from "@/lib/format";
import { audit } from "@/lib/audit";

// CSV-injekció elleni védelem: képletként értelmezhető cellák semlegesítése
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await currentAdmin();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const property = await getProperty();
  if (!property) return new Response("Not found", { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await listBookings(property.id, sp, 5000);
  const header = ["Azonosító", "Státusz", "Forrás", "Érkezés", "Távozás", "Éjszaka", "Felnőtt", "Gyermek", "Vendég neve", "E-mail", "Telefon", "Ország", "Végösszeg (Ft)", "Előleg (Ft)", "Befizetve (Ft)", "Kedvezmény", "Létrehozva", "Megjegyzés"];
  const lines = rows.map((b) => [
    b.reference, STATUS_LABELS[b.status], b.source === "website" ? "Weboldal" : "Kézi", b.check_in, b.check_out,
    b.price?.nights ?? "", b.adults, b.children, b.guest_name, maskEmail(b.guest_email, user), maskPhone(b.guest_phone, user),
    b.guest_country, b.total, b.deposit_due, b.amount_paid, b.price?.discount?.code ?? "", new Date(b.created_at).toISOString(), b.admin_note,
  ].map(cell).join(";"));
  await audit(undefined, user.email, "bookings.exported", "booking", null, { count: rows.length });
  const body = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="foglalasok-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
