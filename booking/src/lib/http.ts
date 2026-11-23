import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "./booking/service";

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip");
}

/** CSRF-védelem JSON POST-okhoz: az Origin a saját host legyen. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export function jsonError(code: string, message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: code, message, ...extra }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof BookingError) return jsonError(err.code, err.message, err.httpStatus, err.extra);
  if (err instanceof z.ZodError) return jsonError("validation", "Hibás vagy hiányzó adat.", 422, { fields: err.issues.map((i) => i.path.join(".")) });
  console.error("[api] váratlan hiba", err);
  return jsonError("server_error", "Váratlan hiba történt. Kérjük, próbálja újra később.", 500);
}

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const stayRequestSchema = z.object({
  checkIn: dateSchema,
  checkOut: dateSchema,
  adults: z.coerce.number().int().min(1).max(30),
  children: z.coerce.number().int().min(0).max(30).default(0),
  couponCode: z.string().trim().max(40).optional().nullable(),
});
