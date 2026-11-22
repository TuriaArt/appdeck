import type { CSSProperties } from "react";
import { Grid2X2 } from "lucide-react";
import { CATEGORIES, type CategoryId } from "../data/catalog";

interface CategoryFiltersProps {
  active: CategoryId | "all";
  counts: Record<CategoryId | "all", number>;
  onChange: (category: CategoryId | "all") => void;
}

export function CategoryFilters({ active, counts, onChange }: CategoryFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="category-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 xl:flex-wrap xl:overflow-visible">
        <button
          type="button"
          data-active={active === "all"}
          style={{ "--chip-accent": "var(--accent)" } as CSSProperties}
          onClick={() => onChange("all")}
          className="category-chip flex h-[34px] items-center gap-2 rounded-full px-3.5 text-[12px] font-medium"
        >
          <Grid2X2 className="h-3.5 w-3.5" />
          Все
          <span className="rounded-full bg-white/[0.065] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
            {counts.all}
          </span>
        </button>

        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            data-active={active === category.id}
            style={{ "--chip-accent": category.accent } as CSSProperties}
            onClick={() => onChange(category.id)}
            title={category.description}
            className="category-chip flex h-[34px] items-center gap-2 rounded-full px-3.5 text-[12px] font-medium"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: category.accent,
                boxShadow: `0 0 8px color-mix(in srgb, ${category.accent} 45%, transparent)`,
              }}
            />
            {category.label}
            <span className="rounded-full bg-white/[0.065] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
              {counts[category.id]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
