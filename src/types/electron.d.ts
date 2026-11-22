export {};

type AppDeckResult = { ok: boolean; error?: string };

declare global {
  interface Window {
    appDeck?: {
      scan: () => Promise<unknown[]>;
      launch: (programId: string) => Promise<AppDeckResult>;
      reveal: (installLocation: string) => Promise<AppDeckResult>;
      webSearch: (query: string) => Promise<AppDeckResult>;
      openExternal: (url: string) => Promise<AppDeckResult>;
      uninstall: (programId: string) => Promise<AppDeckResult & { cancelled?: boolean }>;
      // TODO: в Electron заменить статический список на API поиска или локальную базу соответствий.
      findAlternatives: (programName: string) => Promise<string[]>;
      /** Empty text removes the user's edit; `description` is then null. */
      updateDescription: (programId: string, text: string) => Promise<AppDeckResult & { description?: string | null }>;
      /** `error: "cancelled"` when the file dialog was dismissed. */
      chooseScreenshot: (programId: string) => Promise<AppDeckResult & { screenshot?: string }>;
      /** `dataUrl` is an image from the clipboard; main decodes and saves it as PNG. */
      saveScreenshotFromClipboard: (programId: string, dataUrl: string) => Promise<AppDeckResult & { screenshot?: string }>;
      removeScreenshot: (programId: string) => Promise<AppDeckResult>;
      /** Fires when main rescans after an uninstall. Returns an unsubscribe function. */
      onRegistryUpdated: (callback: (programs: unknown[]) => void) => () => void;
      platform: string;
    };
  }
}
