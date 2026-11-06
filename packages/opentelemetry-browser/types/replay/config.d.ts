/**
 * Invalid values fall back to defaults with a warning, so a bad config never
 * turns replay on nor relaxes masking. Invalid selectors or input options
 * disable replay, since dropping them would record what they should hide.
 * @param {unknown} config the `replay` key of the SDK config
 * @param {boolean} hasRecorder whether the SDK was started from the replay entry point
 * @returns {ResolvedReplayConfig}
 */
export function resolveReplayConfig(config: unknown, hasRecorder: boolean): ResolvedReplayConfig;
/**
 * Input types `maskAllInputs` masks: rrweb's list plus `hidden` and `file`,
 * which rrweb leaves out.
 */
export const MASKABLE_INPUT_TYPES: readonly ["color", "date", "datetime-local", "email", "month", "number", "range", "search", "tel", "text", "time", "url", "week", "textarea", "select", "password", "hidden", "file"];
export type MaskableInputType = (typeof MASKABLE_INPUT_TYPES)[number];
export type ReplayPrivacyConfig = {
    /**
     * replace every input value with `*`, default true
     */
    maskAllInputs?: boolean | undefined;
    /**
     * replace all text content with `*`, default true
     */
    maskAllText?: boolean | undefined;
    /**
     * per input type masking when `maskAllInputs` is false
     */
    maskInputOptions?: Partial<Record<"number" | "text" | "select" | "hidden" | "color" | "date" | "datetime-local" | "email" | "month" | "range" | "search" | "tel" | "time" | "url" | "week" | "textarea" | "password" | "file", boolean>> | undefined;
    /**
     * CSS selector whose text is masked when `maskAllText` is false
     */
    maskTextSelector?: string | undefined;
    /**
     * CSS selector whose elements are replaced by an empty box
     */
    blockSelector?: string | undefined;
    /**
     * CSS selector whose input events are not recorded
     */
    ignoreSelector?: string | undefined;
    /**
     * `element` is null when the SDK cannot look it up
     */
    maskInputFn?: ((text: string, element: HTMLElement | null) => string) | undefined;
    /**
     * `element` is null when the SDK cannot look it up
     */
    maskTextFn?: ((text: string, element: HTMLElement | null) => string) | undefined;
};
export type ReplayConfig = {
    /**
     * default false
     */
    enabled?: boolean | undefined;
    privacy?: ReplayPrivacyConfig | undefined;
};
export type ResolvedReplayConfig = {
    enabled: boolean;
    privacy: Required<Pick<ReplayPrivacyConfig, "maskAllInputs" | "maskAllText">> & Omit<ReplayPrivacyConfig, "maskAllInputs" | "maskAllText">;
};
/**
 * Passed by the replay entry point so the core one never imports the recorder.
 */
export type ReplayStartOptions = {
    config: ResolvedReplayConfig;
    sessionManager?: import("../session.js").SessionManager | undefined;
    resourceAttributes: import("@opentelemetry/api").Attributes;
    exportConfig: {
        url: string;
        headers?: Record<string, string>;
    };
};
export type StartReplayFn = (opts: ReplayStartOptions) => {
    shutdown: () => Promise<void>;
} | undefined;
