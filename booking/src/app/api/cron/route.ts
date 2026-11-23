import { NextResponse } from "next/server";
import { runJobs } from "@/lib/jobs";
import { safeEqual } from "@/lib/security";

// Ütemezett hívás (pl. 5 percenként): Authorization: Bearer <CRON_SECRET>
async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  return NextResponse.json(await runJobs());
}
export { handler as GET, handler as POST };
