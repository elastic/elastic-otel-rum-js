/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ATTR_FRUSTRATION_CLICK_COUNT,
    EVENT_FRUSTRATION_DEAD_CLICK,
    EVENT_FRUSTRATION_ERROR_CLICK,
    EVENT_FRUSTRATION_RAGE_CLICK,
} from '../semconv.js';

/** @typedef {import('@opentelemetry/api').Attributes} Attributes */

/**
 * @typedef {Object} Click
 * @property {object} target Clicks with the same target are grouped
 * @property {boolean} canBeDead Whether no reaction is a dead click
 * @property {boolean} selectsText Text selection is not frustration
 * @property {Attributes} attributes
 */

/**
 * @typedef {Object} ClickChain
 * @property {object} target
 * @property {number} timestamp of the first click
 * @property {number} count
 * @property {number[]} recent times of the last clicks, bounded
 * @property {boolean} rage
 * @property {string | undefined} href
 * @property {boolean} canBeDead
 * @property {boolean} selectsText
 * @property {boolean} active
 * @property {Attributes | undefined} error
 * @property {Set<object>} requests started during the chain, still pending
 * @property {Attributes} attributes
 * @property {ReturnType<typeof setTimeout>} [timer]
 */

/**
 * @callback EmitFn
 * @param {string} eventName
 * @param {Attributes} attributes
 * @param {number} timestamp
 */

/**
 * A chain ends when its target gets no click for this long. It is also how
 * long the page has to react to a click and how long an error is attributed
 * to it, or to the end of a request it started.
 */
export const CLICK_CHAIN_WINDOW_MS = 1000;
export const RAGE_CLICK_MIN_COUNT = 3;
/** Errors after this, since the first click, are never attributed to it */
export const MAX_ERROR_WINDOW_MS = 10_000;

/**
 * Groups clicks on the same target and classifies each group when it ends.
 * DOM agnostic so the rules can be unit tested.
 */
export class ClickChainDetector {
    /**
     * @param {EmitFn} emit
     * @param {{watch?: () => void, unwatch?: () => void}} [hooks] Called when
     *  a click starts and stops waiting for a reaction, to only observe the
     *  page while one does.
     */
    constructor(emit, hooks = {}) {
        this._emit = emit;
        this._hooks = hooks;
        this._watching = false;
        /** @type {ClickChain[]} */
        this._chains = [];
        /**
         * Ended chains whose requests are still pending: an error when they
         * respond is still an error click.
         * @type {ClickChain[]}
         */
        this._waiting = [];
    }

    /** @param {Click} click */
    click(click) {
        const now = Date.now();
        let chain = this._chains.find((c) => c.target === click.target);
        if (chain) {
            const {recent} = chain;
            chain.count++;
            recent.push(now);
            if (recent.length > RAGE_CLICK_MIN_COUNT) {
                recent.shift();
            }
            chain.rage ||=
                recent.length === RAGE_CLICK_MIN_COUNT &&
                now - recent[0] <= CLICK_CHAIN_WINDOW_MS;
            chain.selectsText ||= click.selectsText;
            clearTimeout(chain.timer);
        } else {
            chain = {
                ...click,
                timestamp: now,
                count: 1,
                recent: [now],
                rage: false,
                href: globalThis.location?.href,
                active: false,
                error: undefined,
                requests: new Set(),
            };
            this._chains.push(chain);
            this._updateWatching();
        }
        const current = chain;
        chain.timer = setTimeout(
            () => this._end(current, false),
            CLICK_CHAIN_WINDOW_MS
        );
    }

    /** The page reacted: DOM change, request, scroll... */
    activity() {
        for (const chain of this._chains) {
            chain.active = true;
        }
        this._updateWatching();
    }

    _updateWatching() {
        const watch = this._chains.some((c) => !c.active);
        if (watch !== this._watching) {
            this._watching = watch;
            (watch ? this._hooks.watch : this._hooks.unwatch)?.();
        }
    }

    /** @param {object} request */
    requestStarted(request) {
        this.activity();
        for (const chain of this._chains) {
            chain.requests.add(request);
        }
    }

    /** @param {object} request */
    requestEnded(request) {
        for (const chain of this._chains) {
            chain.requests.delete(request);
        }
        for (const chain of this._waiting) {
            if (chain.requests.delete(request) && !chain.requests.size) {
                this._wait(chain, CLICK_CHAIN_WINDOW_MS);
            }
        }
    }

    /** @param {Attributes} attributes of the error */
    error(attributes) {
        for (const chain of this._chains) {
            chain.error ??= attributes;
        }
        for (const chain of [...this._waiting]) {
            chain.error = attributes;
            this._stopWaiting(chain);
        }
    }

    /**
     * Ends all chains now, when the page is being hidden or left. A page that
     * goes away did react, so no dead clicks are reported.
     */
    flush() {
        for (const chain of [...this._chains]) {
            clearTimeout(chain.timer);
            this._end(chain, true);
        }
        for (const chain of [...this._waiting]) {
            this._stopWaiting(chain);
        }
    }

    /**
     * @param {ClickChain} chain
     * @param {boolean} leaving
     */
    _end(chain, leaving) {
        this._chains.splice(this._chains.indexOf(chain), 1);
        this._updateWatching();

        const {attributes, timestamp} = chain;
        if (chain.rage && !chain.selectsText) {
            this._emit(
                EVENT_FRUSTRATION_RAGE_CLICK,
                {...attributes, [ATTR_FRUSTRATION_CLICK_COUNT]: chain.count},
                timestamp
            );
        }
        const navigated = globalThis.location?.href !== chain.href;
        if (
            chain.canBeDead &&
            !chain.active &&
            !chain.selectsText &&
            !leaving &&
            !navigated
        ) {
            this._emit(EVENT_FRUSTRATION_DEAD_CLICK, attributes, timestamp);
        }
        if (chain.error || leaving || !chain.requests.size) {
            this._emitError(chain);
            return;
        }
        this._waiting.push(chain);
        this._wait(chain, MAX_ERROR_WINDOW_MS);
    }

    /**
     * @param {ClickChain} chain
     * @param {number} ms capped by the max error window
     */
    _wait(chain, ms) {
        clearTimeout(chain.timer);
        const left = chain.timestamp + MAX_ERROR_WINDOW_MS - Date.now();
        chain.timer = setTimeout(
            () => this._stopWaiting(chain),
            Math.min(ms, left)
        );
    }

    /** @param {ClickChain} chain */
    _stopWaiting(chain) {
        clearTimeout(chain.timer);
        this._waiting.splice(this._waiting.indexOf(chain), 1);
        this._emitError(chain);
    }

    /** @param {ClickChain} chain */
    _emitError(chain) {
        if (chain.error) {
            this._emit(
                EVENT_FRUSTRATION_ERROR_CLICK,
                {...chain.attributes, ...chain.error},
                chain.timestamp
            );
        }
    }
}
