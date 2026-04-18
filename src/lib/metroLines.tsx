import { getMetroLines } from "@/data/paris-metro-lines";

export const METRO_LINE_COLORS: Record<string, { bg: string; text: string }> = {
  "1": { bg: "#FFCD00", text: "#000000" },
  "2": { bg: "#003CA6", text: "#FFFFFF" },
  "3": { bg: "#837902", text: "#FFFFFF" },
  "3BIS": { bg: "#6EC4E8", text: "#000000" },
  "4": { bg: "#CF009E", text: "#FFFFFF" },
  "5": { bg: "#FF7E2E", text: "#000000" },
  "6": { bg: "#6ECA97", text: "#000000" },
  "7": { bg: "#FA9ABA", text: "#000000" },
  "7BIS": { bg: "#6ECA97", text: "#000000" },
  "8": { bg: "#E19BDF", text: "#000000" },
  "9": { bg: "#B6BD00", text: "#000000" },
  "10": { bg: "#C9910D", text: "#FFFFFF" },
  "11": { bg: "#704B1C", text: "#FFFFFF" },
  "12": { bg: "#007852", text: "#FFFFFF" },
  "13": { bg: "#6EC4E8", text: "#000000" },
  "14": { bg: "#62259D", text: "#FFFFFF" },
  "RER A": { bg: "#E3051C", text: "#FFFFFF" },
  "RER B": { bg: "#477AB4", text: "#FFFFFF" },
};

export function parseMetroLinesFromName(name: string): string[] {
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (!parenMatch) return [];
  const inner = parenMatch[1];
  const parts = inner.split(/[,;]+/).map((p) => p.trim());
  const lines: string[] = [];
  for (const part of parts) {
    const cleaned = part.replace(/\b(lignes?|lines?)\b/gi, "").trim();
    const rerMatch = cleaned.match(/\bRER\s*([AB])\b/i);
    if (rerMatch) {
      lines.push(`RER ${rerMatch[1].toUpperCase()}`);
      continue;
    }
    const numMatch = cleaned.match(/\b(1[0-4]|[1-9]|3[Bb][Ii][Ss]|7[Bb][Ii][Ss])\b/i);
    if (numMatch) lines.push(numMatch[1].toUpperCase());
  }
  return lines;
}

export function resolveMetroLines(name: string, explicit?: string[]): string[] {
  if (explicit && explicit.length > 0) return explicit;
  const parsed = parseMetroLinesFromName(name);
  if (parsed.length > 0) return parsed;
  const cleanedName = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return getMetroLines(cleanedName);
}

export function MetroLineBadge({ line }: { line: string }) {
  const colors = METRO_LINE_COLORS[line] || { bg: "#6B6B6B", text: "#FFFFFF" };
  const label = line.startsWith("RER ") ? line.slice(4) : line.toLowerCase().replace("bis", "ᵇ");
  return (
    <span
      title={`Ligne ${line}`}
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold leading-none flex-shrink-0"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
