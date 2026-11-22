export type ThemeId = "dark" | "light" | "amoled" | "warm" | "nord";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  background: string;
  surface: string;
  accent: string;
}

export const THEME_STORAGE_KEY = "appdeck.theme";

export const THEMES: ThemeOption[] = [
  {
    id: "dark",
    label: "Тёмная",
    description: "Графит и мягкий фиолетовый",
    background: "#121212",
    surface: "#22222c",
    accent: "#b388ff",
  },
  {
    id: "light",
    label: "Светлая",
    description: "Светлый фон, мягкие тени",
    background: "#f5f5f7",
    surface: "#ffffff",
    accent: "#7950c8",
  },
  {
    id: "amoled",
    label: "AMOLED",
    description: "Чистый чёрный, яркие акценты",
    background: "#000000",
    surface: "#15151c",
    accent: "#c39aff",
  },
  {
    id: "warm",
    label: "Тёплая",
    description: "Кофейный фон и янтарь",
    background: "#1a1410",
    surface: "#30251b",
    accent: "#f2ad58",
  },
  {
    // Official Nord palette (nordtheme.com): nord0 / nord1 / nord8.
    id: "nord",
    label: "Nord",
    description: "Полярная ночь и голубой лёд",
    background: "#2E3440",
    surface: "#3B4252",
    accent: "#88C0D0",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export interface AccentPreset {
  id: string;
  label: string;
  hex: string;
}

export const ACCENT_STORAGE_KEY = "appdeck.accent";

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "lavender", label: "Лаванда", hex: "#B388FF" },
  { id: "sky", label: "Небо", hex: "#38BDF8" },
  { id: "mint", label: "Мята", hex: "#34D399" },
  { id: "amber", label: "Янтарь", hex: "#FBBF24" },
  { id: "coral", label: "Коралл", hex: "#FB7185" },
  { id: "cobalt", label: "Кобальт", hex: "#2563EB" },
  { id: "plum", label: "Слива", hex: "#7C3AED" },
  { id: "teal", label: "Изумруд", hex: "#0F766E" },
];

export const BG_STORAGE_KEY = "appdeck.bg";

export interface GradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
  angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "aurora", label: "Аврора", from: "#1E1B4B", to: "#0F766E", angle: 135 },
  { id: "dusk", label: "Закат", from: "#3B0764", to: "#9A3412", angle: 135 },
  { id: "ocean", label: "Океан", from: "#0F172A", to: "#0369A1", angle: 150 },
  { id: "nordic", label: "Фьорд", from: "#2E3440", to: "#4C566A", angle: 145 },
  { id: "soft", label: "Облако", from: "#E0E7FF", to: "#FCE7F3", angle: 135 },
];

export type CustomBackground =
  | {
      type: "gradient";
      from: string;
      to: string;
      angle: number;
      dim: number;
    }
  | {
      type: "image";
      dataUrl: string;
      name: string;
      dim: number;
    };

export function formatGradientCss(from: string, to: string, angle: number): string {
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
