import sharp from "sharp";
import { writeFile, unlink, stat } from "node:fs/promises";

const SRC = new URL("../public/Logo-gold.png", import.meta.url).pathname;
const ICON = new URL("../src/app/icon.png", import.meta.url).pathname;
const APPLE = new URL("../src/app/apple-icon.png", import.meta.url).pathname;
const OLD_ICO = new URL("../src/app/favicon.ico", import.meta.url).pathname;

// Monogramme gold sur fond blanc (demande client)
const BG = { r: 255, g: 255, b: 255 };

async function buildIcon(size, outputPath) {
  // 1) Trim tout le whitespace du fichier source
  const trimmed = await sharp(SRC).trim().toBuffer();
  const tmeta = await sharp(trimmed).metadata();

  // 2) Crop la zone haute qui contient UNIQUEMENT le monogramme
  //    (le texte MOVE IN PARIS est en bas, ~40% de la hauteur).
  const cropHeight = Math.round(tmeta.height * 0.58);
  const monoBand = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: tmeta.width, height: cropHeight })
    .toBuffer();

  // 3) Trim CE crop pour enlever toute marge blanche/transparente autour
  //    des pixels du monogramme. Résultat = boîte serrée sur le monogramme.
  const tight = await sharp(monoBand).trim({ threshold: 10 }).toBuffer();
  const tightMeta = await sharp(tight).metadata();

  // 4) Place sur fond carré, avec un petit padding pour ne pas coller aux bords
  const padding = Math.round(size * 0.08);
  const inner = size - padding * 2;

  // Conserve le ratio du monogramme dans le carré inner
  const ratio = tightMeta.width / tightMeta.height;
  const targetW = ratio >= 1 ? inner : Math.round(inner * ratio);
  const targetH = ratio >= 1 ? Math.round(inner / ratio) : inner;

  const logoResized = await sharp(tight)
    .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const composed = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...BG, alpha: 1 },
    },
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(outputPath, composed);
  const s = (await stat(outputPath)).size;
  console.log(`${outputPath.split("/").slice(-2).join("/")}: ${size}x${size} (${(s / 1024).toFixed(1)} KB) — tight monogram ${tightMeta.width}x${tightMeta.height}`);
}

(async () => {
  await buildIcon(64, ICON);
  await buildIcon(180, APPLE);

  try {
    await unlink(OLD_ICO);
    console.log("Deleted old favicon.ico (Next.js will use icon.png)");
  } catch { /* no-op */ }

  console.log("Done.");
})();
