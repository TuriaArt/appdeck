import { useCallback, useLayoutEffect, useState } from "react";
import {
  ACCENT_STORAGE_KEY,
  BG_STORAGE_KEY,
  formatGradientCss,
  isThemeId,
  THEME_STORAGE_KEY,
  type CustomBackground,
  type ThemeId,
} from "../data/themes";
import { bestContrastText, hexToRgba, normalizeHex } from "../utils/color";

const ACCENT_VARS = [
  "--accent",
  "--accent-strong",
  "--accent-text",
  "--accent-soft",
  "--accent-border",
  "--accent-contrast",
  "--accent-glow",
  "--user-accent",
] as const;

function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(saved)) return saved;
  } catch {
    // Private browsing / disabled storage: keep the session usable.
  }
  return "dark";
}

function readAccent(): string | null {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    return saved ? normalizeHex(saved) : null;
  } catch {
    return null;
  }
}

function isValidBackground(value: unknown): value is CustomBackground {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.dim !== "number" || candidate.dim < 0 || candidate.dim > 90) return false;
  if (candidate.type === "gradient") {
    return (
      typeof candidate.from === "string" &&
      Boolean(normalizeHex(candidate.from)) &&
      typeof candidate.to === "string" &&
      Boolean(normalizeHex(candidate.to)) &&
      typeof candidate.angle === "number"
    );
  }
  if (candidate.type === "image") {
    return (
      typeof candidate.dataUrl === "string" &&
      candidate.dataUrl.startsWith("data:image/") &&
      typeof candidate.name === "string"
    );
  }
  return false;
}

function readCustomBackground(): CustomBackground | null {
  try {
    const raw = localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidBackground(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function applyAccentVariables(hex: string | null) {
  const rootStyle = document.documentElement.style;
  if (!hex) {
    for (const name of ACCENT_VARS) rootStyle.removeProperty(name);
    delete document.documentElement.dataset.customAccent;
    return;
  }
  const normalized = normalizeHex(hex);
  if (!normalized) return;
  rootStyle.setProperty("--accent", normalized);
  rootStyle.setProperty("--accent-strong", normalized);
  rootStyle.setProperty("--accent-text", normalized);
  rootStyle.setProperty("--accent-soft", hexToRgba(normalized, 0.12));
  rootStyle.setProperty("--accent-border", hexToRgba(normalized, 0.34));
  rootStyle.setProperty("--accent-contrast", bestContrastText(normalized));
  rootStyle.setProperty("--accent-glow", hexToRgba(normalized, 0.2));
  rootStyle.setProperty("--user-accent", normalized);
  document.documentElement.dataset.customAccent = "true";
}

export function applyBackgroundVariables(bg: CustomBackground | null) {
  const root = document.documentElement;
  if (!bg) {
    delete root.dataset.customBg;
    root.style.removeProperty("--custom-bg-image");
    root.style.removeProperty("--custom-bg-dim");
    return;
  }
  root.dataset.customBg = bg.type;
  const imageValue =
    bg.type === "gradient"
      ? formatGradientCss(bg.from, bg.to, bg.angle)
      : `url("${bg.dataUrl}")`;
  root.style.setProperty("--custom-bg-image", imageValue);
  root.style.setProperty("--custom-bg-dim", `${bg.dim}%`);
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>(readTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still switches when persistent storage is unavailable.
    }
  }, [theme]);

  return { theme, setTheme };
}

export function useAccent() {
  const [accent, setAccentState] = useState<string | null>(readAccent);

  useLayoutEffect(() => {
    applyAccentVariables(accent);
    try {
      if (accent) {
        localStorage.setItem(ACCENT_STORAGE_KEY, accent);
      } else {
        localStorage.removeItem(ACCENT_STORAGE_KEY);
      }
    } catch {
      // Keeps working in memory even if storage is blocked.
    }
  }, [accent]);

  const setAccent = useCallback((hex: string | null) => {
    setAccentState(hex ? normalizeHex(hex) : null);
  }, []);

  return { accent, setAccent };
}

export function useCustomBackground() {
  const [customBg, setCustomBgState] = useState<CustomBackground | null>(readCustomBackground);

  useLayoutEffect(() => {
    applyBackgroundVariables(customBg);
  }, [customBg]);

  const persist = useCallback((next: CustomBackground | null): boolean => {
    try {
      if (next) {
        localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(BG_STORAGE_KEY);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const setCustomBg = useCallback(
    (next: CustomBackground | null): { persisted: boolean } => {
      setCustomBgState(next);
      return { persisted: persist(next) };
    },
    [persist]
  );

  const updateDim = useCallback(
    (dim: number) => {
      setCustomBgState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, dim };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { customBg, setCustomBg, updateDim };
}
