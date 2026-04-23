import sharp from "sharp";
import { readdir, stat, rename, unlink } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";

const PUBLIC = new URL("../public/", import.meta.url).pathname;

const CONFIG = {
  hero: { maxW: 2000, quality: 80 },
  apartment: { maxW: 1600, quality: 78 },
  default: { maxW: 1920, quality: 80 },
};

const EXCLUDE = [/\.webp$/i, /\.avif$/i, /\.svg$/i, /favicon/i, /icon/i, /logo\.(png|svg)$/i];

function pickPreset(path) {
  if (/hero|salon-haussmann|cuisine|chambre|salle-de-bain|vue-paris|salon-orange|salon-bibliotheque/i.test(path)) return "hero";
  if (/apartments\//i.test(path)) return "apartment";
  return "default";
}

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function compressOne(file) {
  const ext = extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png"].includes(ext)) return null;
  if (EXCLUDE.some((r) => r.test(file))) return null;

  const origSize = (await stat(file)).size;
  if (origSize < 80 * 1024) return null;

  const preset = CONFIG[pickPreset(file)];

  const tmp = `${file}.tmp`;
  const img = sharp(file, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const resizeOpts = meta.width && meta.width > preset.maxW ? { width: preset.maxW, withoutEnlargement: true } : null;

  let pipe = img;
  if (resizeOpts) pipe = pipe.resize(resizeOpts);

  if (ext === ".png") {
    pipe = pipe.png({ quality: preset.quality, compressionLevel: 9, palette: true });
  } else {
    pipe = pipe.jpeg({ quality: preset.quality, progressive: true, mozjpeg: true });
  }

  await pipe.toFile(tmp);
  const newSize = (await stat(tmp)).size;

  if (newSize >= origSize) {
    await unlink(tmp);
    return { file, skipped: true, origSize, newSize };
  }

  await rename(tmp, file);
  return { file, origSize, newSize, saved: origSize - newSize, preset: pickPreset(file) };
}

function fmt(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

(async () => {
  const all = await walk(PUBLIC);
  console.log(`Scanning ${all.length} files...`);

  let totalBefore = 0, totalAfter = 0, processed = 0;
  for (const f of all) {
    try {
      const r = await compressOne(f);
      if (!r) continue;
      if (r.skipped) continue;
      processed++;
      totalBefore += r.origSize;
      totalAfter += r.newSize;
      const rel = f.replace(PUBLIC, "");
      console.log(`[${r.preset}] ${rel}: ${fmt(r.origSize)} → ${fmt(r.newSize)} (−${((1 - r.newSize / r.origSize) * 100).toFixed(0)}%)`);
    } catch (e) {
      console.error(`ERR ${f}:`, e.message);
    }
  }

  console.log("\n=== TOTAL ===");
  console.log(`Files processed: ${processed}`);
  console.log(`Before: ${fmt(totalBefore)}`);
  console.log(`After:  ${fmt(totalAfter)}`);
  console.log(`Saved:  ${fmt(totalBefore - totalAfter)} (${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`);
})();
