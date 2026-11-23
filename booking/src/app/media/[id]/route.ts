import { queryOne } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const thumb = new URL(req.url).searchParams.get("size") === "thumb";
  const row = await queryOne<{ data: Buffer; mime: string }>(
    `SELECT ${thumb ? "thumb" : "data"} AS data, mime FROM media WHERE id = $1`,
    [id],
  );
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
