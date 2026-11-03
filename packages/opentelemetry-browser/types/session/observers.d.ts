/** @typedef {import('./state.js').SessionInfo} SessionInfo */
/** @typedef {import('./state.js').SessionState} SessionState */
/**
 * Same shape as the upstream `SessionObserver`, with optional callbacks.
 * @typedef {Object} SessionObserver
 * @property {(session: SessionInfo, previous?: SessionInfo) => void} [onSessionStarted]
 * @property {(session: SessionInfo) => void} [onSessionEnded]
 */
/**
 * Delivers session changes to observers. Events are queued and delivered in
 * order by a single loop, so a change published from a callback (e.g. a read
 * made by telemetry) is delivered after the current one.
 */
export class SessionObservers {
    /** @type {Set<{observer: SessionObserver}>} */
    _observers: Set<{
        observer: SessionObserver;
    }>;
    /** @type {Array<{type: 'ended' | 'started', session: SessionState}>} */
    _events: Array<{
        type: "ended" | "started";
        session: SessionState;
    }>;
    /** @type {SessionState | undefined} */
    _lastEnded: SessionState | undefined;
    _flushing: boolean;
    /**
     * @param {SessionObserver} observer
     * @returns {() => void} unsubscribe
     */
    add(observer: SessionObserver): () => void;
    clear(): void;
    /**
     * @param {SessionState | undefined} ended
     * @param {SessionState | undefined} started
     */
    publish(ended: SessionState | undefined, started: SessionState | undefined): void;
    _flush(): void;
    /** @param {(observer: SessionObserver) => void} call */
    _notify(call: (observer: SessionObserver) => void): void;
}
export type SessionInfo = import("./state.js").SessionInfo;
export type SessionState = import("./state.js").SessionState;
/**
 * Same shape as the upstream `SessionObserver`, with optional callbacks.
 */
export type SessionObserver = {
    onSessionStarted?: ((session: SessionInfo, previous?: SessionInfo) => void) | undefined;
    onSessionEnded?: ((session: SessionInfo) => void) | undefined;
};
