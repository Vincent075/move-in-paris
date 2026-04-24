import fs from "node:fs";
import path from "node:path";

export type OgCover = { url: string; width: number; height: number; alt: string };

const DEFAULT: Omit<OgCover, "alt"> = {
  url: "/Logo-gold.png",
  width: 1200,
  height: 630,
};

function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) return null;
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (
    buf[0] !== 0x89 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x4e ||
    buf[3] !== 0x47
  )
    return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function resolveOgCover(relativePath: string, alt: string): OgCover {
  try {
    const abs = path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));
    const buf = fs.readFileSync(abs).subarray(0, 4096);
    const size =
      readJpegSize(buf) ?? readPngSize(buf) ?? { width: DEFAULT.width, height: DEFAULT.height };
    return { url: relativePath, width: size.width, height: size.height, alt };
  } catch {
    return { ...DEFAULT, alt };
  }
}
