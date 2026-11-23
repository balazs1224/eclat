import { NextResponse } from "next/server";
import { quote } from "@/lib/booking/service";
import { getProperty } from "@/lib/property";
import { handleError, jsonError, stayRequestSchema } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = stayRequestSchema.parse(await req.json());
    const property = await getProperty();
    if (!property) return jsonError("not_found", "Nincs szállás.", 404);
    const result = await quote(property.id, body);
    if (!result.ok) return jsonError(result.error, result.message, 422, { minNights: result.minNights });
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
