// SVG illusztrációk → WebP (teljes méret + 800 px), a feltöltött fotókkal azonos formátumban.
// Futtatás a booking/ mappából: node scripts/illustrations/rasterize.mjs [név…]
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "illustrations");
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".svg") && (!only.length || only.includes(f.replace(/\.svg$/, ""))));

for (const f of files) {
  const base = f.replace(/\.svg$/, "");
  const src = path.join(dir, f);
  const full = await sharp(src, { density: 96 }).resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(dir, `${base}.webp`));
  await sharp(src, { density: 96 }).resize({ width: 800 }).webp({ quality: 80 }).toFile(path.join(dir, `${base}-800.webp`));
  console.log(`${base}.webp ${full.width}×${full.height} ${Math.round(full.size / 1024)} KB`);
}
