"use strict";

/**
 * Keys of the user's edits in overrides.json. Pure functions, no Electron dependency,
 * so node scripts/native-check.cjs can test them without opening a window.
 *
 * A program's id is built from its DISPLAY NAME ("7-Zip 26.04" → "7-zip-26-04"), so it changes
 * when the program updates. The registry key (…\Uninstall\7-Zip) normally does not, so edits are
 * stored under it. Programs without a registry key fall back to the name-based id.
 */
const crypto = require("node:crypto");

/**
 * Registry keys are case-insensitive on Windows, hence lower-cased. Ids are slugs without
 * backslashes, so a registry key and a name-based id can never collide.
 */
function overrideKeyFor(program) {
  const registryKey = typeof program?.registryKey === "string" ? program.registryKey.trim() : "";
  if (registryKey) return registryKey.toLowerCase();
  return String(program?.id ?? "");
}

/**
 * Moves records saved under the old name-based id to the registry key of the program with that
 * name. Old records are deleted. Idempotent: a second run finds nothing to move.
 *
 *  - program without a registry key: nothing to move, the name-based record stays;
 *  - record for a program that is not installed (no match in `programs`): untouched;
 *  - both an old and a registry-key record exist: the registry-key one wins field by field,
 *    the old one only fills gaps, and its screenshot file is reported as discarded.
 *
 * Mutates `overrides`. Returns { moved: [{ from, to }], discardedScreenshots: [fileName] }.
 */
function migrateOverrides(overrides, programs) {
  const moved = [];
  const discardedScreenshots = [];
  for (const program of programs) {
    const legacyKey = String(program.id);
    const registryKey = overrideKeyFor(program);
    if (registryKey === legacyKey) continue;
    const legacy = overrides[legacyKey];
    if (!legacy) continue;

    const current = overrides[registryKey];
    if (current) {
      if (legacy.screenshot && current.screenshot && legacy.screenshot !== current.screenshot) {
        discardedScreenshots.push(legacy.screenshot);
      }
      overrides[registryKey] = { ...legacy, ...current };
    } else {
      overrides[registryKey] = legacy;
    }
    delete overrides[legacyKey];
    moved.push({ from: legacyKey, to: registryKey });
  }
  return { moved, discardedScreenshots };
}

function safeFileName(programId) {
  return String(programId).replace(/[^a-z0-9а-яё_-]+/gi, "-").slice(0, 120) || "app";
}

/**
 * Name of the copied screenshot: <programId><ext>. The key is no longer the id, so another
 * record may already own that file name (a program was renamed, a different one took its old
 * name). Then a short hash of the key is added instead of overwriting someone else's picture.
 */
function screenshotFileName(overrides, key, programId, extension) {
  const ext = String(extension).toLowerCase();
  const base = safeFileName(programId);
  const taken = new Set();
  for (const [otherKey, entry] of Object.entries(overrides)) {
    if (otherKey !== key && entry && typeof entry.screenshot === "string") taken.add(entry.screenshot.toLowerCase());
  }
  const plain = `${base}${ext}`;
  if (!taken.has(plain.toLowerCase())) return plain;

  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 8);
  let candidate = `${base}-${hash}${ext}`;
  for (let counter = 2; taken.has(candidate.toLowerCase()); counter += 1) {
    candidate = `${base}-${hash}-${counter}${ext}`;
  }
  return candidate;
}

module.exports = { overrideKeyFor, migrateOverrides, safeFileName, screenshotFileName };
