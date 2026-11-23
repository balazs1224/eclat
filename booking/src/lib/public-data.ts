import { cache } from "react";
import { query } from "./db";
import { getProperty, type PropertyRow } from "./property";

export interface MediaItem {
  id: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  is_cover: boolean;
}

export const getPublicData = cache(async (): Promise<{ property: PropertyRow; media: MediaItem[] }> => {
  const property = await getProperty();
  if (!property) throw new Error("A szállás nincs inicializálva. Futtasd: npm run db:migrate && npm run db:seed");
  const media = await query<MediaItem>(
    "SELECT id, width, height, alt, caption, is_cover FROM media WHERE property_id = $1 ORDER BY is_cover DESC, sort, created_at",
    [property.id],
  );
  return { property, media };
});

export function isPlaceholder(s: string | null | undefined): boolean {
  return !s || s.includes("[PLACEHOLDER");
}
