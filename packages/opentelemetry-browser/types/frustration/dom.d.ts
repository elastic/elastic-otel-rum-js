/**
 * Reports rage, dead and error clicks as log events.
 * @param {import('@opentelemetry/api').Logger} logger
 * @param {FrustrationConfig} config
 * @returns {{
 *  requestStarted: (request: object) => void,
 *  requestEnded: (request: object) => void,
 *  stop: () => void,
 * }}
 */
export function startFrustrationDetection(logger: import("@opentelemetry/api").Logger, config: FrustrationConfig): {
    requestStarted: (request: object) => void;
    requestEnded: (request: object) => void;
    stop: () => void;
};
export type FrustrationConfig = import("./config.js").FrustrationConfig;
export type Attributes = import("./detector.js").Attributes;
export type EmitFn = import("./detector.js").EmitFn;
