import { NextResponse } from "next/server";
import { createHold, releaseHold } from "@/lib/booking/service";
import { getProperty } from "@/lib/property";
import { clientIp, handleError, jsonError, sameOrigin, stayRequestSchema } from "@/lib/http";
import { hashIp } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return jsonError("forbidden", "Érvénytelen kérés.", 403);
    const ipHash = hashIp(clientIp(req));
    if (ipHash && !(await rateLimit(`hold:${ipHash}`, 20, 60))) return jsonError("rate_limited", "Túl sok próbálkozás. Kérjük, próbálja később.", 429);
    const body = stayRequestSchema.parse(await req.json());
    const property = await getProperty();
    if (!property) return jsonError("not_found", "Nincs szállás.", 404);
    const hold = await createHold({ ...body, propertyId: property.id, ipHash });
    return NextResponse.json({ ok: true, ...hold, bookingMode: property.booking_mode });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    if (!sameOrigin(req)) return jsonError("forbidden", "Érvénytelen kérés.", 403);
    const { bookingId, holdToken } = (await req.json()) as { bookingId?: string; holdToken?: string };
    if (typeof bookingId !== "string" || typeof holdToken !== "string" || !/^[0-9a-f-]{36}$/.test(bookingId))
      return jsonError("validation", "Hibás kérés.", 422);
    await releaseHold(bookingId, holdToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
