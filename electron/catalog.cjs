"use strict";

/**
 * Single place where the main process reads the curated catalog.
 * NOTE for packaging: src/data/descriptions.json must be shipped with the app
 * (see README → "Сборка установщика").
 */
const DESCRIPTIONS = require("../src/data/descriptions.json");

const CATEGORY_IDS = new Set([
  "craft", "dev", "audio", "graphics", "ai", "system", "internet", "security", "other",
]);

// Tokens allowed right after a catalog name, e.g. "7-Zip 26.04 (x64 edition)".
const VERSION_TAIL_WORDS = new Set(["x64", "x86", "64", "32", "bit", "edition", "portable", "beta", "lts", "rc"]);

const CATALOG_ENTRIES = Object.entries(DESCRIPTIONS)
  .filter(([name, entry]) => name !== "_comment" && entry && typeof entry === "object")
  .map(([name, entry]) => ({ name, key: normalizeName(name), entry }));

/** Lowercase, ё→е, drop "(...)" blocks, collapse punctuation to single spaces. */
function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function isVersionTail(rest) {
  if (!rest) return true;
  const first = rest.split(" ")[0];
  return /^\d/.test(first) || VERSION_TAIL_WORDS.has(first);
}

/**
 * Exact match after normalization, or the longest catalog name that is a prefix
 * followed by a version/edition tail. "Google Chrome" must NOT match "Google".
 */
function findCatalogEntry(programName) {
  const normalized = normalizeName(programName);
  if (!normalized) return null;
  let best = null;
  for (const item of CATALOG_ENTRIES) {
    if (normalized === item.key) return item;
    if (normalized.startsWith(`${item.key} `)) {
      const rest = normalized.slice(item.key.length + 1);
      if (isVersionTail(rest) && (!best || item.key.length > best.key.length)) best = item;
    }
  }
  return best;
}

/** Adds catalogName and category (from descriptions.json) to scanned programs. */
function mergeWithCatalog(programs) {
  return programs.map((program) => {
    const match = findCatalogEntry(program.name);
    const category = match && CATEGORY_IDS.has(match.entry.category) ? match.entry.category : "other";
    return { ...program, catalogName: match ? match.name : null, category };
  });
}

const REPO_ALLOWLIST = new Set(
  CATALOG_ENTRIES.map((item) => item.entry.repoUrl).filter((url) => typeof url === "string" && url.startsWith("https://"))
);

module.exports = {
  DESCRIPTIONS,
  REPO_ALLOWLIST,
  normalizeName,
  findCatalogEntry,
  mergeWithCatalog,
};
