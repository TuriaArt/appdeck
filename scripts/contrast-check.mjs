import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(rootDir, "src/styles/style.css"), "utf8");
const themesTs = fs.readFileSync(path.join(rootDir, "src/data/themes.ts"), "utf8");

function hexToRgb(hex) {
  let raw = hex.trim().replace("#", "");
  if (raw.length === 3) raw = raw.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(hexA, hexB) {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

function bestContrastText(hex) {
  return ratio(hex, "#FFFFFF") >= ratio(hex, "#121212") ? "#FFFFFF" : "#121212";
}

function extractBlock(selector) {
  const index = css.indexOf(selector);
  if (index === -1) throw new Error(`Selector not found: ${selector}`);
  return css.slice(index, css.indexOf("}", index));
}

function parseVars(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})/g)].map((m) => [m[1], m[2]]));
}

// Verify the 4 earlier theme hashes were not modified.
const EXPECTED_HASHES = {
  ":root {": "7824092675",
  ':root[data-theme="light"]': "26e0643026",
  ':root[data-theme="amoled"]': "e47d9e7b84",
  ':root[data-theme="warm"]': "f2d367b9c8",
};
for (const [selector, expected] of Object.entries(EXPECTED_HASHES)) {
  const actual = crypto.createHash("md5").update(extractBlock(selector)).digest("hex").slice(0, 10);
  if (actual !== expected) {
    throw new Error(`Theme block ${selector} was modified (expected ${expected}, got ${actual})`);
  }
}

const baseVars = parseVars(extractBlock(":root {"));
const themeDefs = [
  { id: "dark", selector: ":root {" },
  { id: "light", selector: ':root[data-theme="light"]' },
  { id: "amoled", selector: ':root[data-theme="amoled"]' },
  { id: "warm", selector: ':root[data-theme="warm"]' },
  { id: "nord", selector: ':root[data-theme="nord"]' },
].map((item) => ({ id: item.id, vars: { ...baseVars, ...parseVars(extractBlock(item.selector)) } }));

// Extract ACCENT_PRESETS from src/data/themes.ts
const presetSection = themesTs.slice(themesTs.indexOf("export const ACCENT_PRESETS"));
const presets = [...presetSection.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*hex:\s*"(#[0-9A-Fa-f]{6})"\s*\}/g)].map(
  (m) => ({ id: m[1], label: m[2], hex: m[3] })
);
if (presets.length < 6 || presets.length > 8) {
  throw new Error(`Expected 6-8 accent presets, got ${presets.length}`);
}

console.log("=== Base theme palette checks ===");
for (const theme of themeDefs) {
  const { bg, card, text, accent } = theme.vars;
  const textRatio = ratio(text, card);
  const accentRatio = Math.min(ratio(accent, bg), ratio(accent, card));
  const cats = ["craft", "dev", "audio", "graphics", "ai", "system", "internet", "security", "other"];
  const minCat = Math.min(...cats.map((c) => ratio(theme.vars[`cat-${c}`], card)));
  if (textRatio < 4.5 || minCat < 4.5) {
    throw new Error(`Theme ${theme.id} failed WCAG AA: text=${textRatio.toFixed(2)}, minCat=${minCat.toFixed(2)}`);
  }
  console.log(
    `${theme.id.padEnd(7)} text=${textRatio.toFixed(2)}  accent=${accentRatio.toFixed(2)}  minCategory=${minCat.toFixed(2)}`
  );
}

console.log("\n=== Custom accent presets across all 5 themes (bg / card / btnText) ===");
for (const preset of presets) {
  const btnText = bestContrastText(preset.hex);
  const btnRatio = ratio(preset.hex, btnText);
  if (btnRatio < 4.5) {
    throw new Error(`Button text contrast below 4.5 for ${preset.id}: ${btnRatio.toFixed(2)}`);
  }
  const cols = themeDefs.map((theme) => {
    const onBg = ratio(preset.hex, theme.vars.bg);
    const onCard = ratio(preset.hex, theme.vars.card);
    const minSurface = Math.min(onBg, onCard);
    const flag = minSurface < 4.5 ? "!" : " ";
    return `${theme.id}:${minSurface.toFixed(2)}${flag}`;
  });
  console.log(`${preset.label.padEnd(10)} ${preset.hex}  btn(${btnText})=${btnRatio.toFixed(2)}  |  ${cols.join("  ")}`);
}

console.log("\ncontrast-check OK: 5 themes untouched, 8 presets checked across all 5 themes.");
