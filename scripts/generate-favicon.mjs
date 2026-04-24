import sharp from "sharp";
import { writeFile, unlink, stat } from "node:fs/promises";

const SRC = new URL("../public/Logo-gold.png", import.meta.url).pathname;
const ICON = new URL("../src/app/icon.png", import.meta.url).pathname;
const APPLE = new URL("../src/app/apple-icon.png", import.meta.url).pathname;
const OLD_ICO = new URL("../src/app/favicon.ico", import.meta.url).pathname;

// Monogramme gold sur fond blanc (demande client)
const BG = { r: 255, g: 255, b: 255 };

async function buildIcon(size, outputPath) {
  // Trim marges -> puis crop top square pour garder SEULEMENT le monogramme
  // (le fichier source contient aussi "MOVE IN PARIS" en texte sous le monogramme,
  // illisible à 32x32. On garde juste le monogramme.)
  const trimmed = await sharp(SRC).trim().toBuffer();
  const tmeta = await sharp(trimmed).metadata();

  // Le monogramme occupe ~60% de la hauteur (le reste = texte). On extrait
  // un carré centré en haut de l'image trimée.
  const cropSize = Math.min(tmeta.width, Math.round(tmeta.height * 0.58));
  const cropLeft = Math.round((tmeta.width - cropSize) / 2);
  const monogram = await sharp(trimmed)
    .extract({ left: cropLeft, top: 0, width: cropSize, height: cropSize })
    .toBuffer();

  const padding = Math.round(size * 0.28);
  const inner = size - padding * 2;

  const logoResized = await sharp(monogram)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
  console.log(`${outputPath.split("/").slice(-2).join("/")}: ${size}x${size} (${(s / 1024).toFixed(1)} KB) from monogram ${cropSize}x${cropSize}`);
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
