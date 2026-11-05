/**
 * Invalid values fall back to defaults with a warning, so a bad config never
 * turns replay on nor relaxes masking.
 * @param {unknown} config the `replay` key of the SDK config
 * @param {boolean} hasRecorder whether the SDK was started from the replay entry point
 * @returns {ResolvedReplayConfig}
 */
export function resolveReplayConfig(config: unknown, hasRecorder: boolean): ResolvedReplayConfig;
export type ReplayPrivacyConfig = {
    /**
     * replace every input value with `*`, default true
     */
    maskAllInputs?: boolean | undefined;
    /**
     * replace all text content with `*`, default false
     */
    maskAllText?: boolean | undefined;
    /**
     * per input type masking, as in rrweb
     */
    maskInputOptions?: Record<string, boolean> | undefined;
    /**
     * CSS selector whose text is masked
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
    maskInputFn?: ((text: string, element: HTMLElement) => string) | undefined;
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
