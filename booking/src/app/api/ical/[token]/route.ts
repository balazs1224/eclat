import { exportCalendar } from "@/lib/ical";
import { getProperty } from "@/lib/property";
import { safeEqual } from "@/lib/security";

// Export-naptár a csatornák számára: /api/ical/<token>.ics  — opcionálisan ?exclude=<feedId>
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const property = await getProperty();
  const clean = token.replace(/\.ics$/, "");
  if (!property || !safeEqual(clean, property.ical_export_token)) return new Response("Not found", { status: 404 });
  const exclude = Number(new URL(req.url).searchParams.get("exclude")) || null;
  const body = await exportCalendar(property.id, property.name, exclude);
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
