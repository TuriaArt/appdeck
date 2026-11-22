import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  Flame,
  ImagePlus,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Snowflake,
  Sun,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  ACCENT_PRESETS,
  formatGradientCss,
  GRADIENT_PRESETS,
  THEMES,
  type CustomBackground,
  type ThemeId,
} from "../data/themes";
import { bestContrastText, contrastRatio } from "../utils/color";
import { cn } from "../utils/cn";
import { prepareBackgroundImage } from "../utils/imageBackground";

interface ThemePickerProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
  accent: string | null;
  onAccentChange: (hex: string | null) => void;
  customBg: CustomBackground | null;
  onCustomBgChange: (bg: CustomBackground | null) => void;
  onBackgroundDimChange: (dim: number) => void;
  onNotify: (message: string) => void;
}

const THEME_ICONS = { dark: Moon, light: Sun, amoled: Zap, warm: Flame, nord: Snowflake };

// Exact --card hex per theme (kept in sync with src/styles/style.css without touching theme blocks).
const THEME_CARD_HEX: Record<ThemeId, string> = {
  dark: "#1c1c23",
  light: "#ffffff",
  amoled: "#0d0d12",
  warm: "#261f19",
  nord: "#2E3440",
};

const DEFAULT_GRADIENT_ANGLE = 135;

export function ThemePicker({
  theme,
  onChange,
  accent,
  onAccentChange,
  customBg,
  onCustomBgChange,
  onBackgroundDimChange,
  onNotify,
}: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [customGradientOpen, setCustomGradientOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputId = useId();
  const dimSliderId = useId();
  const angleSliderId = useId();

  const current = THEMES.find((option) => option.id === theme) ?? THEMES[0];
  const effectiveAccent = accent ?? current.accent;
  const themeBgRatio = contrastRatio(effectiveAccent, current.background);
  const themeCardRatio = contrastRatio(effectiveAccent, THEME_CARD_HEX[theme]);
  const minSurfaceRatio = Math.min(themeBgRatio, themeCardRatio);
  const buttonTextRatio = contrastRatio(effectiveAccent, bestContrastText(effectiveAccent));
  const lowContrast = Boolean(accent) && minSurfaceRatio < 4.5;

  const gradientFrom = customBg?.type === "gradient" ? customBg.from : "#1E1B4B";
  const gradientTo = customBg?.type === "gradient" ? customBg.to : "#0F766E";
  const gradientAngle = customBg?.type === "gradient" ? customBg.angle : DEFAULT_GRADIENT_ANGLE;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await prepareBackgroundImage(file);
      onCustomBgChange({
        type: "image",
        dataUrl,
        name: file.name,
        dim: customBg?.dim ?? 45,
      });
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={rootRef} className="relative order-4 shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "header-control flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-[12px] font-medium",
          open && "is-open"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Тема оформления: ${current.label}`}
        title="Тема оформления"
      >
        <Palette className="h-[15px] w-[15px] text-accent" />
        <span className="hidden 2xl:inline">Тема</span>
        <ChevronDown
          className={cn("hidden h-3 w-3 text-muted transition-transform sm:block", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Выбор темы"
          className="theme-menu menu-surface thin-scroll absolute right-0 top-[calc(100%+10px)] z-50 max-h-[calc(100vh-84px)] w-[324px] overflow-y-auto rounded-2xl p-2"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Оформление
            </span>
            <span className="text-[9px] text-faint">Сохраняется автоматически</span>
          </div>

          {THEMES.map((option) => {
            const Icon = THEME_ICONS[option.id];
            const selected = option.id === theme;
            const swatchAccent = accent ?? option.accent;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={cn(
                  "theme-option flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left",
                  selected && "is-selected"
                )}
              >
                <span
                  className="theme-swatch relative flex h-10 w-12 shrink-0 items-end justify-end overflow-hidden rounded-lg border p-1.5"
                  style={{
                    background: option.background,
                    borderColor: option.id === "light" ? "#d8d5e0" : "rgba(128,128,128,.3)",
                  }}
                >
                  <span
                    className="absolute left-1.5 top-1.5 h-1 w-5 rounded-full opacity-50"
                    style={{ background: swatchAccent }}
                  />
                  <span
                    className="absolute bottom-1.5 left-1.5 h-4 w-5 rounded-[3px]"
                    style={{ background: option.surface }}
                  />
                  <span className="h-4 w-3 rounded-[3px]" style={{ background: swatchAccent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                    <Icon className="h-3 w-3 text-muted" />
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted">{option.description}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            );
          })}

          <div className="mx-1 mt-2 border-t border-subtle px-1 pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Свой акцент
              </span>
              <div className="flex min-w-0 items-center gap-1.5">
                <label
                  htmlFor={colorInputId}
                  className="header-control flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 font-mono text-[9.5px]"
                  title="Выбрать произвольный цвет"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-subtle"
                    style={{ backgroundColor: effectiveAccent }}
                  />
                  <span>{effectiveAccent.toUpperCase()}</span>
                  <input
                    id={colorInputId}
                    type="color"
                    value={effectiveAccent}
                    onChange={(event) => onAccentChange(event.target.value)}
                    className="sr-only"
                    aria-label="Выбрать произвольный цвет акцента"
                  />
                </label>
                {accent && (
                  <button
                    type="button"
                    onClick={() => onAccentChange(null)}
                    className="header-control flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-medium"
                    title="Вернуться к акценту темы"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            <div
              className="mt-2.5 grid grid-cols-8 gap-1"
              role="radiogroup"
              aria-label="Пресеты акцента"
            >
              {ACCENT_PRESETS.map((preset) => {
                const selected = accent === preset.hex;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Акцент ${preset.label} (${preset.hex})`}
                    title={`${preset.label} · ${preset.hex}`}
                    onClick={() => onAccentChange(preset.hex)}
                    className={cn(
                      "accent-swatch relative flex aspect-square w-full min-w-0 items-center justify-center rounded-full transition-transform hover:scale-110",
                      selected && "is-selected"
                    )}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {selected && (
                      <Check
                        className="h-3 w-3"
                        strokeWidth={2.8}
                        style={{ color: bestContrastText(preset.hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {lowContrast && (
              <div
                role="status"
                className="notice-warning mt-2.5 flex items-start gap-2 rounded-xl px-2.5 py-2 text-[10.5px] leading-[1.45]"
              >
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <span className="font-semibold">
                    Низкий контраст с фоном темы: {minSurfaceRatio.toFixed(2)}:1
                  </span>{" "}
                  (рекомендуется ≥ 4.5:1; текст на кнопке {buttonTextRatio.toFixed(2)}:1).
                </div>
              </div>
            )}
          </div>

          <div className="mx-1 mt-2.5 border-t border-subtle px-1 pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Свой фон
              </span>
              {customBg && (
                <button
                  type="button"
                  onClick={() => onCustomBgChange(null)}
                  className="header-control flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-medium"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Сбросить фон
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {GRADIENT_PRESETS.map((preset) => {
                // The angle is now free-form, so a preset stays "active" by its two colours.
                const selected =
                  customBg?.type === "gradient" &&
                  customBg.from.toUpperCase() === preset.from.toUpperCase() &&
                  customBg.to.toUpperCase() === preset.to.toUpperCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Градиент ${preset.label}`}
                    title={`Градиент: ${preset.label}`}
                    onClick={() =>
                      onCustomBgChange({
                        type: "gradient",
                        from: preset.from,
                        to: preset.to,
                        angle: preset.angle,
                        dim: customBg?.dim ?? 25,
                      })
                    }
                    className={cn(
                      "bg-swatch relative flex h-8 items-center justify-center rounded-lg border transition-transform hover:scale-[1.04]",
                      selected && "is-selected"
                    )}
                    style={{ backgroundImage: formatGradientCss(preset.from, preset.to, preset.angle) }}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="picker-action-btn header-control flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg"
              >
                <ImagePlus className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="min-w-0 whitespace-nowrap">{uploading ? "Обработка…" : "Изображение"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomGradientOpen((value) => !value)}
                className={cn(
                  "picker-action-btn header-control flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg",
                  customGradientOpen && "is-open"
                )}
                aria-expanded={customGradientOpen}
                title="Настроить свой градиент"
              >
                <Sliders className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 whitespace-nowrap">Градиент</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => void handleImageUpload(event)}
                className="hidden"
                aria-label="Загрузить фоновое изображение"
              />
            </div>

            {customGradientOpen && (
              <div className="surface-inset mt-2 min-w-0 space-y-2 rounded-xl p-2">
                <div className="grid min-w-0 grid-cols-2 gap-1.5">
                  <label className="flex min-w-0 items-center justify-between gap-1 text-[10px] text-secondary">
                    <span>Старт</span>
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(event) =>
                        onCustomBgChange({
                          type: "gradient",
                          from: event.target.value.toUpperCase(),
                          to: gradientTo,
                          angle: gradientAngle,
                          dim: customBg?.dim ?? 25,
                        })
                      }
                      className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                  <label className="flex min-w-0 items-center justify-between gap-1 text-[10px] text-secondary">
                    <span>Конец</span>
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(event) =>
                        onCustomBgChange({
                          type: "gradient",
                          from: gradientFrom,
                          to: event.target.value.toUpperCase(),
                          angle: gradientAngle,
                          dim: customBg?.dim ?? 25,
                        })
                      }
                      className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="bg-swatch h-7 w-10 shrink-0 rounded-md border"
                    style={{ backgroundImage: formatGradientCss(gradientFrom, gradientTo, gradientAngle) }}
                    title={`Превью градиента · ${gradientAngle}°`}
                    aria-label={`Превью градиента · ${gradientAngle}°`}
                    data-testid="gradient-live-preview"
                  />
                  <label htmlFor={angleSliderId} className="shrink-0 text-[10px] text-muted">
                    Угол —
                  </label>
                  <input
                    id={angleSliderId}
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={gradientAngle}
                    onChange={(event) =>
                      onCustomBgChange({
                        type: "gradient",
                        from: gradientFrom,
                        to: gradientTo,
                        angle: Number(event.target.value),
                        dim: customBg?.dim ?? 25,
                      })
                    }
                    className="range-slider min-w-0 flex-1"
                    aria-label={`Угол градиента — ${gradientAngle}°`}
                  />
                  <span className="w-9 shrink-0 text-right font-mono text-[10px] text-secondary">
                    {gradientAngle}°
                  </span>
                </div>
              </div>
            )}

            {customBg && (
              <div className="mt-2 space-y-1.5">
                {customBg.type === "image" && (
                  <p className="truncate text-[10px] text-muted" title={customBg.name}>
                    Файл: <span className="text-secondary">{customBg.name}</span>
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <label htmlFor={dimSliderId} className="text-[10px] text-muted">
                    Затемнение
                  </label>
                  <input
                    id={dimSliderId}
                    type="range"
                    min={0}
                    max={85}
                    step={5}
                    value={customBg.dim}
                    onChange={(event) => onBackgroundDimChange(Number(event.target.value))}
                    className="range-slider flex-1"
                  />
                  <span className="w-8 text-right font-mono text-[10px] text-secondary">
                    {customBg.dim}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mx-2 mt-2 border-t border-subtle pb-1 pt-2 text-[9px] text-faint">
            Цвета категорий адаптируются к каждой теме
          </div>
        </div>
      )}
    </div>
  );
}
