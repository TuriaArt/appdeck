import descriptions from "../data/descriptions.json";
import alternativeDetails from "../data/alternativeDetails.json";
import {
  CATEGORIES,
  CATEGORY_MAP,
  type CategoryId,
  type Program,
  type SortMode,
} from "../data/catalog";

export interface DescriptionEntry {
  description: string | null;
  isOpensource: boolean;
  repoUrl: string | null;
  alternatives: string[];
}
const DESCRIPTION_MAP = descriptions as unknown as Record<string, DescriptionEntry>;
const ALTERNATIVE_DETAILS = alternativeDetails as Record<string, string>;

export interface AlternativeItem {
  name: string;
  description: string;
  installed: Program | null;
  category: CategoryId;
}

const ALTERNATIVE_ALIASES: Record<string, string[]> = {
  "xo": ["xo sample graph"],
  "serum": ["xfer records serum 2"],
  "serum 2": ["xfer records serum 2"],
  "pigments": ["arturia pigments"],
  "pure sub": ["arturia pure sub"],
  "playbeat": ["audiomodern playbeat"],
  "riffer": ["audiomodern riffer"],
  "zebra": ["u-he zebra3"],
  "zebra3": ["u-he zebra3"],
  "vs code": ["microsoft visual studio code"],
  "visual studio code": ["microsoft visual studio code"],
  "thunderbird": ["mozilla thunderbird"],
};

function normalizeName(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
}

export function getProgramMeta(program: Program): DescriptionEntry {
  return DESCRIPTION_MAP[program.catalogName ?? program.name] ?? {
    description: program.hint ?? null,
    isOpensource: false,
    repoUrl: null,
    alternatives: [],
  };
}

export function getRepoUrl(program: Program): string | null {
  const meta = getProgramMeta(program);
  return meta.isOpensource && meta.repoUrl?.startsWith("https://") ? meta.repoUrl : null;
}

export function findInstalledAlternative(name: string, programs: Program[]): Program | null {
  const normalized = normalizeName(name);
  const aliases = (ALTERNATIVE_ALIASES[normalized] ?? []).map(normalizeName);
  return programs.find((program) => {
    const installedName = normalizeName(program.name);
    return installedName === normalized || aliases.includes(installedName);
  }) ?? null;
}

export function getAlternatives(program: Program, programs: Program[]): AlternativeItem[] {
  return getProgramMeta(program).alternatives.map((name) => {
    const installed = findInstalledAlternative(name, programs);
    return {
      name,
      description: ALTERNATIVE_DETAILS[name] ?? (installed ? getDescription(installed) : null) ?? "Описание не найдено",
      installed,
      category: installed?.category ?? program.category,
    };
  });
}

const categoryOrder = new Map(CATEGORIES.map((category, index) => [category.id, index]));
const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

/** True when the program shows text the user wrote instead of the catalog description. */
export function hasUserDescription(program: Program): boolean {
  return typeof program.description === "string" && program.description.trim().length > 0;
}

export function getDescription(program: Program): string | null {
  if (hasUserDescription(program)) return program.description as string;
  return DESCRIPTION_MAP[program.catalogName ?? program.name]?.description ?? program.hint ?? null;
}

export function hasDescription(program: Program): boolean {
  return Boolean(getDescription(program));
}

export function getCategory(program: Program) {
  return CATEGORY_MAP[program.category];
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

export function formatInstallDate(iso: string | null): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Registry size is whole MB. Shown as MB below 1 GB, otherwise GB with one decimal. */
export function formatSize(sizeMB: number | null | undefined): string {
  if (sizeMB === null || sizeMB === undefined) return "нет данных";
  if (sizeMB >= 1024) return `${(sizeMB / 1024).toFixed(1).replace(".", ",")} ГБ`;
  return `${sizeMB} МБ`;
}

export function pluralizePrograms(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "программа";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "программы";
  return "программ";
}

export function filterAndSortPrograms(
  programs: Program[],
  query: string,
  category: CategoryId | "all",
  sort: SortMode
): Program[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");

  const filtered = programs.filter((program) => {
    if (category !== "all" && program.category !== category) return false;
    if (!normalizedQuery) return true;

    const categoryMeta = CATEGORY_MAP[program.category];
    const haystack = [
      program.name,
      program.version,
      program.publisher,
      program.hint ?? "",
      categoryMeta.label,
      getDescription(program) ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("ru");

    return normalizedQuery.split(/\s+/).every((token) => haystack.includes(token));
  });

  return filtered.sort((a, b) => {
    if (sort === "name") return collator.compare(a.name, b.name);
    if (sort === "date") {
      return new Date(b.installedAt ?? 0).getTime() - new Date(a.installedAt ?? 0).getTime();
    }
    const categoryDiff =
      (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0);
    return categoryDiff !== 0 ? categoryDiff : collator.compare(a.name, b.name);
  });
}

export function categoryCounts(programs: Program[]): Record<CategoryId | "all", number> {
  const counts = { all: programs.length } as Record<CategoryId | "all", number>;
  for (const category of CATEGORIES) counts[category.id] = 0;
  for (const program of programs) counts[program.category] += 1;
  return counts;
}
