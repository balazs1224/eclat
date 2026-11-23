import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeBooking } from "@/lib/booking/service";
import { handleError, jsonError, sameOrigin } from "@/lib/http";

const schema = z.object({
  bookingId: z.string().uuid(),
  holdToken: z.string().min(10).max(200),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(40).regex(/^[+0-9 ()/-]+$/),
  country: z.string().trim().max(60).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  privacy: z.literal(true),
  terms: z.literal(true),
  website: z.string().max(0).optional(), // honeypot: embernek láthatatlan mező
});

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return jsonError("forbidden", "Érvénytelen kérés.", 403);
    const body = schema.parse(await req.json());
    const res = await finalizeBooking({
      bookingId: body.bookingId,
      holdToken: body.holdToken,
      guest: { name: body.name, email: body.email.toLowerCase(), phone: body.phone, country: body.country, message: body.message },
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return handleError(err);
  }
}
