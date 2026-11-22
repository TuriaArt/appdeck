import type { CategoryId, Program } from "./catalog";

interface RawProgram {
  name: string;
  version: string;
  publisher: string;
  hint?: string;
  category: CategoryId;
}

// TODO(native): заменить этот массив результатом сканирования реестра Windows.
// Ветки: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
// и HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall.
const RAW_PROGRAMS: RawProgram[] = [
  // Craft App Suite (20)
  { name: "AniCraft", version: "0.2.1", publisher: "Learning Machines LLC", hint: "2D-векторная анимация", category: "craft" },
  { name: "ArtCraft Launcher", version: "0.19.2", publisher: "Learning Machines LLC", hint: "лаунчер набора Craft App Suite", category: "craft" },
  { name: "CADCraft", version: "0.20.1", publisher: "Learning Machines LLC", hint: "автоматизированное проектирование (CAD)", category: "craft" },
  { name: "Craft Anything", version: "0.6.1", publisher: "Learning Machines LLC", hint: "узнай, как устроена любая программа, и собери свою", category: "craft" },
  { name: "DeckCraft", version: "0.18.1", publisher: "Learning Machines LLC", hint: "презентации и слайд-шоу", category: "craft" },
  { name: "DesignCraft", version: "0.20.1", publisher: "Learning Machines LLC", hint: "вёрстка и издательское дело", category: "craft" },
  { name: "EffectCraft", version: "0.24.1", publisher: "Learning Machines LLC", hint: "моушн-графика и визуальные эффекты", category: "craft" },
  { name: "FigCraft", version: "0.18.1", publisher: "Learning Machines LLC", hint: "дизайн интерфейсов и прототипирование", category: "craft" },
  { name: "FilmCraft", version: "0.20.1", publisher: "Learning Machines LLC", hint: "монтаж видео, цветокоррекция и звук", category: "craft" },
  { name: "GridCraft", version: "0.19.1", publisher: "Learning Machines LLC", hint: "электронные таблицы и данные", category: "craft" },
  { name: "LightCraft", version: "0.21.1", publisher: "Learning Machines LLC", category: "craft" },
  { name: "MailCraft", version: "0.13.0", publisher: "MailCraft contributors", category: "craft" },
  { name: "MaterialCraft", version: "0.4.1", publisher: "Learning Machines LLC", hint: "создание процедурных материалов", category: "craft" },
  { name: "PdfCraft", version: "0.21.1", publisher: "Learning Machines LLC", hint: "чтение, упорядочивание и защита PDF", category: "craft" },
  { name: "PhotoCraft", version: "0.23.1", publisher: "Learning Machines LLC", category: "craft" },
  { name: "SolidCraft", version: "0.45.0", publisher: "SolidCraft contributors", category: "craft" },
  { name: "SoundCraft", version: "0.20.1", publisher: "Learning Machines LLC", hint: "запись, редактирование и сведение звука", category: "craft" },
  { name: "TextureCraft", version: "0.6.1", publisher: "Learning Machines LLC", hint: "рисование 3D-текстур", category: "craft" },
  { name: "VectorCraft", version: "0.24.1", publisher: "Learning Machines LLC", category: "craft" },
  { name: "WordCraft", version: "0.18.1", publisher: "Learning Machines LLC", hint: "тексты и оформление документов", category: "craft" },

  // Разработка (26)
  { name: "CMake", version: "4.4.4", publisher: "Kitware", category: "dev" },
  { name: "DB Browser for SQLite", version: "3.13.1", publisher: "DB Browser for SQLite Team", category: "dev" },
  { name: "FFmpeg", version: "9.0.2", publisher: "Gyan", category: "dev" },
  { name: "Git", version: "2.56.0.3", publisher: "The Git Development Community", category: "dev" },
  { name: "GitHub CLI", version: "2.103.3", publisher: "GitHub, Inc.", category: "dev" },
  { name: "GitHub Copilot CLI", version: "1.0.112", publisher: "GitHub, Inc.", category: "dev" },
  { name: "Microsoft .NET SDK 10.0.201", version: "10.2.126.15422", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Microsoft .NET SDK 10.0.404", version: "10.4.426.53019", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Microsoft .NET SDK 9.0.203", version: "9.2.325.16509", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Microsoft .NET SDK 9.0.321", version: "9.3.2126.52810", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Microsoft Visual Studio Code", version: "1.146.0", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Microsoft Visual Studio Installer", version: "4.12.34.54489", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Neovim", version: "0.12.6", publisher: "neovim.io", category: "dev" },
  { name: "ninja", version: "1.13.2", publisher: "ninja-build", category: "dev" },
  { name: "Node.js", version: "26.13.1", publisher: "Node.js Foundation", category: "dev" },
  { name: "Pulsar", version: "1.133.1", publisher: "Pulsar-Edit", category: "dev" },
  { name: "Python 3.10", version: "3.10.11", publisher: "Python Software Foundation", category: "dev" },
  { name: "Python 3.12", version: "3.12.10", publisher: "Python Software Foundation", category: "dev" },
  { name: "Python 3.14", version: "3.14.7", publisher: "Python Software Foundation", category: "dev" },
  { name: "Python 3.15", version: "3.15.0", publisher: "Python Software Foundation", category: "dev" },
  { name: "Rustup", version: "1.29.3", publisher: "", hint: "инсталлятор тулчейна Rust", category: "dev" },
  { name: "Visual Studio Build Tools 2022", version: "17.14.45", publisher: "Microsoft Corporation", category: "dev" },
  { name: "vs_CoreEditorFonts", version: "17.7.40001", publisher: "Microsoft Corporation", hint: "шрифты редактора Visual Studio", category: "dev" },
  { name: "Windows SDK", version: "10.1.26100.9457", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Windows SDK AddOn", version: "10.1.0.0", publisher: "Microsoft Corporation", category: "dev" },
  { name: "Zed", version: "1.28.1", publisher: "Zed Industries", category: "dev" },

  // Аудио и музыка (39)
  { name: "7DeadlySnares", version: "1.1.1", publisher: "Beatsurfing", category: "audio" },
  { name: "A1TriggerGate", version: "1.44", publisher: "Alex Hilton / A1AUDIO.DE", category: "audio" },
  { name: "Absynth", version: "6.2.0", publisher: "Native Instruments", category: "audio" },
  { name: "ADSR Orbit", version: "1.0.0", publisher: "ADSR", category: "audio" },
  { name: "Airglow", version: "1.2.0", publisher: "S1gns Of L1fe", category: "audio" },
  { name: "AIMP", version: "6.00.3095 Beta 7", publisher: "Artem Izmaylov", category: "audio" },
  { name: "Arturia Pigments", version: "7.0.0", publisher: "Arturia", category: "audio" },
  { name: "Arturia Pure SUB", version: "1.0.1", publisher: "Arturia", category: "audio" },
  { name: "Audiomodern Playbeat", version: "4.2.2", publisher: "Audiomodern", category: "audio" },
  { name: "Audiomodern Riffer", version: "3.0", publisher: "Audiomodern", category: "audio" },
  { name: "BEAM", version: "2.3.1", publisher: "Lunacy Audio", category: "audio" },
  { name: "BeatDrop", version: "1.0", publisher: "Maxim Volskiy", category: "audio" },
  { name: "Bitwig Studio", version: "6.1.7", publisher: "Bitwig GmbH", category: "audio" },
  { name: "DAWbro", version: "1.1.0", publisher: "Lars-Ivo Schmidt", category: "audio" },
  { name: "Fold EQ", version: "1.1", publisher: "Ridge Sound", category: "audio" },
  { name: "HY-Plugins Sequencer Bundle", version: "", publisher: "HY-Plugins", category: "audio" },
  { name: "Imaginando Colapso", version: "1.0.1", publisher: "Imaginando, Lda.", category: "audio" },
  { name: "Instacomposer 3", version: "3.0.1", publisher: "W.A. Production", category: "audio" },
  { name: "Jonas Eriksson Phase Fiasco Bundle", version: "", publisher: "Phase Fiasco", category: "audio" },
  { name: "Jura Trace", version: "1.2.0", publisher: "juralabs", category: "audio" },
  { name: "KeySolutions Sounds Traveler", version: "1.0.9", publisher: "KeySolutions Sounds", category: "audio" },
  { name: "LMMS", version: "1.3.0-alpha.2", publisher: "LMMS Developers", category: "audio" },
  { name: "LOW", version: "1.0.0", publisher: "Beatsurfing", category: "audio" },
  { name: "Melody Sauce 3", version: "3.1.0", publisher: "Evabeat", category: "audio" },
  { name: "MixDesk X", version: "1.42.000", publisher: "Adelvo", category: "audio" },
  { name: "MorningDAW", version: "1.6.5", publisher: "Morningdew Media AB", category: "audio" },
  { name: "NeuralNote", version: "2.2.0", publisher: "Dr. Audio", category: "audio" },
  { name: "PhraseLab", version: "1.0.1", publisher: "Higher Plane Software Ltd", category: "audio" },
  { name: "Polarity-GLUE", version: "0.1.3", publisher: "Polarity-Music", category: "audio" },
  { name: "Polarity-Recorder", version: "0.2.3", publisher: "Polarity-Music", category: "audio" },
  { name: "PolySWAM", version: "1.0.0", publisher: "Audio Modeling", category: "audio" },
  { name: "reFX Rippler", version: "1.1.2", publisher: "reFX Audio Software Inc.", category: "audio" },
  { name: "Rhythmizer Ultra", version: "1.1", publisher: "Futurephonic", category: "audio" },
  { name: "StepStrum", version: "1.1.3", publisher: "Notewerks", category: "audio" },
  { name: "Synthesizer V Studio 2 Core", version: "2.2.2", publisher: "", category: "audio" },
  { name: "TC Electronic SYSTEM 6000 NATIVE Bundle", version: "1.0.0.0", publisher: "TC Electronic", category: "audio" },
  { name: "u-he Zebra3", version: "3.0.0", publisher: "Urs Heckmann", category: "audio" },
  { name: "Xfer Records Serum 2", version: "2.1.5", publisher: "Xfer Records", category: "audio" },
  { name: "XO Sample Graph", version: "3.0.0", publisher: "", category: "audio" },

  // Графика и видео (10)
  { name: "Cutout", version: "2.1.0", publisher: "local", category: "graphics" },
  { name: "OBS Studio", version: "33.0.1", publisher: "OBS Project", category: "graphics" },
  { name: "Paintstorm Studio", version: "2.49", publisher: "Paintstorm Studio", category: "graphics" },
  { name: "PhotoScape X Pro", version: "4.2.8", publisher: "Store", category: "graphics" },
  { name: "PhotoSuite", version: "0.9.15", publisher: "photosuite", category: "graphics" },
  { name: "Realistic Paint Studio", version: "2.00", publisher: "Realistic Paint Studio", category: "graphics" },
  { name: "Shotcut", version: "26.9.27", publisher: "Meltytech", category: "graphics" },
  { name: "Spout 2 OBS Plugin", version: "1.12.0", publisher: "OBS Spout2 Plugin", category: "graphics" },
  { name: "TouchDesigner", version: "2025.32460", publisher: "Derivative Inc.", category: "graphics" },
  { name: "VideoCull", version: "2.3.2", publisher: "StippieDot", category: "graphics" },

  // ИИ и автоматизация (5)
  { name: "Ollama", version: "0.40.16", publisher: "Ollama", category: "ai" },
  { name: "Langflow", version: "1.12.6", publisher: "LangflowDesktop", category: "ai" },
  { name: "DeepSeek Harness", version: "0.2.2-rc.3", publisher: "DeepSeek", category: "ai" },
  { name: "Oh My HuggingFace", version: "0.0.20", publisher: "Oh My HuggingFace contributors", category: "ai" },
  { name: "OpenKnowledge", version: "0.78.0", publisher: "Inkeep", category: "ai" },

  // Утилиты и система (17)
  { name: "7-Zip", version: "26.04", publisher: "Igor Pavlov", category: "system" },
  { name: "Disk Cleanup Helper", version: "1.1", publisher: "Philip Droubi", category: "system" },
  { name: "Everything", version: "1.4.1.1032", publisher: "voidtools", category: "system" },
  { name: "Flow Launcher", version: "2.1.4", publisher: "Flow-Launcher Team", category: "system" },
  { name: "Helium", version: "0.19.4.1", publisher: "", category: "system" },
  { name: "HiBit Uninstaller", version: "4.0.10.100", publisher: "HiBitSoftware", category: "system" },
  { name: "HOTS Uninstaller", version: "1.0", publisher: "Darsono", category: "system" },
  { name: "HuionTablet", version: "15.7.6", publisher: "Shenzhen Huion Animation Technology", category: "system" },
  { name: "Kando", version: "3.0.0", publisher: "Simon Schneegans", category: "system" },
  { name: "Minitorrent", version: "1.0.0", publisher: "Minitorrent", category: "system" },
  { name: "Punto Switcher", version: "4.5.0", publisher: "Яндекс", category: "system" },
  { name: "qBittorrent", version: "5.3.0", publisher: "The qBittorrent project", category: "system" },
  { name: "Sigma File Manager", version: "2.2.0", publisher: "sigma-file-manager", category: "system" },
  { name: "SnapTray", version: "1.0.72", publisher: "Victor Fu", category: "system" },
  { name: "Task Manager TMOG", version: "1.1.1.0", publisher: "Plummer's Software LLC", category: "system" },
  { name: "Wingetix", version: "1.1.0", publisher: "Wingetix", category: "system" },
  { name: "Windhawk", version: "1.7.3", publisher: "Ramen Software", category: "system" },

  // Интернет и связь (6)
  { name: "Figma", version: "126.10.10", publisher: "Figma, Inc.", category: "internet" },
  { name: "Google", version: "1.0.26.0", publisher: "Google", category: "internet" },
  { name: "Hotspot Shield", version: "12.18.0", publisher: "Pango Inc.", category: "internet" },
  { name: "Telegram Desktop", version: "7.4.4", publisher: "Telegram FZ-LLC", category: "internet" },
  { name: "Yandex", version: "26.10.3.771", publisher: "Yandex", category: "internet" },
  { name: "Кнопки сервисов Яндекса на панели задач", version: "4.0.0.0", publisher: "Яндекс", category: "internet" },

  // Сертификаты и безопасность (5)
  { name: "Авест CSP BEL", version: "6.3.0.842", publisher: "ЗАО \"АВЕСТ\"", category: "security" },
  { name: "Персональный менеджер сертификатов Авест", version: "6.1.0", publisher: "AVEST plc.", category: "security" },
  { name: "AvCMXWebP AllUsers", version: "1.1.20", publisher: "AVEST plc.", category: "security" },
  { name: "G-SecTLS", version: "1.0.0", publisher: "NII TZI", category: "security" },
  { name: "NT Client Software", version: "1.0.0", publisher: "NII TZI", category: "security" },

  // Прочее (19)
  { name: "Dewiar", version: "1.0.34", publisher: "Dewiar", category: "other" },
  { name: "Freebuff", version: "0.0.154", publisher: "Freebuff, Inc.", category: "other" },
  { name: "LANORA", version: "1.2.0", publisher: "", category: "other" },
  { name: "LYNX SHARE", version: "0.1.24", publisher: "LYNX SHARE", category: "other" },
  { name: "MD-Converter", version: "1.2.0", publisher: "MD-Converter", category: "other" },
  { name: "MDZip Studio", version: "1.6.0", publisher: "MDZip Project", category: "other" },
  { name: "murmure", version: "2.0.3", publisher: "al1x-ai", category: "other" },
  { name: "NectarLink", version: "0.1.5", publisher: "The NectarLink contributors", category: "other" },
  { name: "OmniRoute", version: "3.8.53", publisher: "OmniRoute Team", category: "other" },
  { name: "Openscreen", version: "2.2.2", publisher: "Etienne Lescot", category: "other" },
  { name: "Orfeo", version: "1.5.4", publisher: "SquareBow", category: "other" },
  { name: "PecoFence", version: "0.2.3", publisher: "Dayuan Jiang", category: "other" },
  { name: "Route Map", version: "0.5.0-beta.4", publisher: "OSINTPH", category: "other" },
  { name: "SampleGraph", version: "0.3.0", publisher: "deriio", category: "other" },
  { name: "Sandyne", version: "2.6.0.0", publisher: "Sandyne Oy", category: "other" },
  { name: "Sting", version: "1.0.2", publisher: "if-tah", category: "other" },
  { name: "Tolaria", version: "2026.11.2", publisher: "refactoring", category: "other" },
  { name: "Vibseek Studio", version: "0.7.2", publisher: "fronx", category: "other" },
  { name: "ZuBrIQ Desktop", version: "2.3.0-2", publisher: "ZuBrIQ", category: "other" },
];

const DEMO_SCAN_DATE = new Date("2026-02-18T12:00:00.000Z");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

// TODO(native): брать InstallDate из реестра. Сейчас даты детерминированно
// сгенерированы для прототипа, чтобы сортировка по дате была проверяемой.
export const PROGRAMS: Program[] = RAW_PROGRAMS.map((program, index) => {
  const installedAt = new Date(DEMO_SCAN_DATE);
  installedAt.setUTCDate(installedAt.getUTCDate() - (((index * 17) % 320) + 2));
  return {
    ...program,
    id: slugify(program.name),
    installedAt: installedAt.toISOString(),
  };
});

export const TOTAL_PROGRAMS = PROGRAMS.length;
