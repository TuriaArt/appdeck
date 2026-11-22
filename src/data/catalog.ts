export type CategoryId =
  | "craft"
  | "dev"
  | "audio"
  | "graphics"
  | "ai"
  | "system"
  | "internet"
  | "security"
  | "other";

export type SortMode = "name" | "category" | "date";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  accent: string;
  description: string;
}

export interface Program {
  id: string;
  name: string;
  version: string;
  publisher: string;
  category: CategoryId;
  hint?: string;
  installedAt: string | null;
  installLocation?: string;
  uninstallString?: string;
  registryKey?: string;
  /** Key in descriptions.json when the scanned name matched a catalog entry. */
  catalogName?: string | null;
  /** data: URL of the PNG extracted from DisplayIcon (Electron only). */
  icon?: string | null;
  /** From the registry EstimatedSize (KB → MB). Null when absent. */
  estimatedSizeMB?: number | null;
  /** Launchable .exe from DisplayIcon (Electron only). */
  executable?: string;
  /** User-written description. Overrides the catalog text when it is a non-empty string. */
  description?: string | null;
  /** URL of the user's screenshot (Electron: appdeck-media://screenshots/<file>). */
  screenshot?: string | null;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "craft", label: "Craft App Suite", accent: "var(--cat-craft)", description: "Творческие инструменты одной экосистемы" },
  { id: "dev", label: "Разработка", accent: "var(--cat-dev)", description: "Редакторы, SDK и средства сборки" },
  { id: "audio", label: "Аудио и музыка", accent: "var(--cat-audio)", description: "DAW, синтезаторы, эффекты и сэмплы" },
  { id: "graphics", label: "Графика и видео", accent: "var(--cat-graphics)", description: "Дизайн, фотография, 3D и видеомонтаж" },
  { id: "ai", label: "ИИ и автоматизация", accent: "var(--cat-ai)", description: "Локальные модели и AI-пайплайны" },
  { id: "system", label: "Утилиты и система", accent: "var(--cat-system)", description: "Инструменты для ежедневной работы" },
  { id: "internet", label: "Интернет и связь", accent: "var(--cat-internet)", description: "Браузеры, мессенджеры и сервисы" },
  { id: "security", label: "Сертификаты и безопасность", accent: "var(--cat-security)", description: "Криптография и менеджеры сертификатов" },
  { id: "other", label: "Прочее", accent: "var(--cat-other)", description: "Приложения без точной категории" },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<CategoryId, CategoryMeta>;

export const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "category", label: "По категории" },
  { id: "name", label: "По названию" },
  { id: "date", label: "По дате установки" },
];
