export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let raw = match[1];
  if (raw.length === 3) {
    raw = raw
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${raw.toUpperCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#000000";
  const raw = normalized.slice(1);
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const [lighter, darker] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks #FFFFFF or #121212 whichever gives higher contrast against `backgroundHex`. */
export function bestContrastText(backgroundHex: string): "#FFFFFF" | "#121212" {
  const whiteRatio = contrastRatio(backgroundHex, "#FFFFFF");
  const darkRatio = contrastRatio(backgroundHex, "#121212");
  return whiteRatio >= darkRatio ? "#FFFFFF" : "#121212";
}
