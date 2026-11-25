import type {EdotInjectConfig} from './websites.js';

declare global {
  interface Window {
    /** Set by the extension immediately before loading the EDOT bundle. */
    __EDOT_EXT_CONFIG__?: EdotInjectConfig;
    /** Host marker to avoid injecting EDOT more than once per navigation. */
    __EDOT_EXT_ACTIVE__?: string;
    /** Populated by the injected script after EDOT starts. */
    edotBrowser?: {shutdown: () => Promise<void>};
    /** Global from elastic-otel-browser.min.js */
    startBrowserSdk?: (cfg: Record<string, unknown>) => {shutdown: () => Promise<void>};
  }
}

export {};
