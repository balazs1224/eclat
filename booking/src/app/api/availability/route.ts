import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/booking/service";
import { getProperty } from "@/lib/property";
import { addDays, diffDays, isIsoDate, todayIn } from "@/lib/dates";
import { handleError, jsonError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const today = todayIn();
    const from = url.searchParams.get("from") ?? today;
    const to = url.searchParams.get("to") ?? addDays(from, 450);
    if (!isIsoDate(from) || !isIsoDate(to) || to <= from || diffDays(from, to) > 550) return jsonError("invalid_range", "Érvénytelen időszak.");
    const property = await getProperty();
    if (!property) return jsonError("not_found", "Nincs szállás.", 404);
    const data = await getAvailability(property.id, from, to);
    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
