/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {logs, SeverityNumber} from '@opentelemetry/api-logs';
import {getSessionId} from './session.js';

export const EVENT_RAGE_CLICK = 'browser.frustration.rage_click';
export const EVENT_DEAD_CLICK = 'browser.frustration.dead_click';
export const EVENT_ERROR_CLICK = 'browser.frustration.error_click';

const RAGE_WINDOW_MS = 1000;
const RAGE_THRESHOLD = 3;
const DEAD_CLICK_MS = 2000;
const ERROR_CLICK_MS = 1000;

const INTERACTIVE_TAGS = new Set([
    'A',
    'BUTTON',
    'INPUT',
    'SELECT',
    'TEXTAREA',
    'SUMMARY',
    'LABEL',
    'OPTION',
]);
const INTERACTIVE_ROLES = new Set([
    'button',
    'link',
    'tab',
    'menuitem',
    'checkbox',
    'radio',
    'switch',
    'option',
    'textbox',
    'combobox',
    'slider',
]);

let _active = false;
/** @type {((this: Document, ev: MouseEvent) => void) | null} */
let _onClick = null;
/** @type {(() => void) | null} */
let _onError = null;
/** @type {MutationObserver | null} */
let _mutObs = null;
/** @type {Array<{xpath: string, ts: number}>} */
let _recentClicks = [];
/** @type {{xpath: string, ts: number} | null} */
let _lastClick = null;
let _rageEmittedForKey = '';
/** @type {Set<ReturnType<typeof setTimeout>>} */
let _deadTimers = new Set();
let _sawActivity = false;

/**
 * True when `el` or an ancestor is a typical interactive control.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
export function isInteractiveElement(el) {
    let node = el;
    while (node && node !== document.documentElement) {
        if (node instanceof HTMLElement) {
            if (INTERACTIVE_TAGS.has(node.tagName)) {
                return true;
            }
            const role = node.getAttribute('role');
            if (role && INTERACTIVE_ROLES.has(role)) {
                return true;
            }
            if (node.isContentEditable) {
                return true;
            }
            if (
                typeof node.onclick === 'function' ||
                node.hasAttribute('onclick')
            ) {
                return true;
            }
            const tabIndex = node.getAttribute('tabindex');
            if (tabIndex != null && Number(tabIndex) >= 0) {
                return true;
            }
        }
        node = node.parentElement;
    }
    return false;
}

/**
 * Stable-enough XPath for frustration targeting (not a full XPath 1.0 serializer).
 *
 * @param {Element | null} el
 * @returns {string}
 */
export function xpathForElement(el) {
    if (!el || el.nodeType !== 1) {
        return '';
    }
    /** @type {string[]} */
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (!parent) {
            parts.unshift(tag);
            break;
        }
        const siblings = Array.from(parent.children).filter(
            (child) => child.tagName === node.tagName
        );
        if (siblings.length === 1) {
            parts.unshift(tag);
        } else {
            parts.unshift(`${tag}[${siblings.indexOf(node) + 1}]`);
        }
        node = parent;
    }
    return `/${parts.join('/')}`;
}

/**
 * Count rage bursts: ≥`threshold` clicks on the same target within `windowMs`.
 *
 * @param {Array<{xpath: string, ts: number}>} clicks
 * @param {number} [windowMs]
 * @param {number} [threshold]
 * @returns {number}
 */
export function countRageBursts(
    clicks,
    windowMs = RAGE_WINDOW_MS,
    threshold = RAGE_THRESHOLD
) {
    let rage = 0;
    let runStart = 0;
    let runCount = 0;
    let runKey = '';
    let counted = false;
    for (const click of clicks) {
        const key = click.xpath || '∅';
        if (key === runKey && click.ts - runStart <= windowMs) {
            runCount += 1;
            if (runCount >= threshold && !counted) {
                rage += 1;
                counted = true;
            }
        } else {
            runKey = key;
            runStart = click.ts;
            runCount = 1;
            counted = false;
        }
    }
    return rage;
}

function _emit(eventName, xpath) {
    const logger = logs.getLogger('elastic-browser');
    const sessionId = getSessionId() ?? '';
    logger.emit({
        body: eventName,
        eventName,
        severityNumber: SeverityNumber.INFO,
        attributes: {
            target_xpath: xpath,
            'session.id': sessionId,
            'rum.sessionId': sessionId,
            'page.url': window.location.href,
            'page.url.path': window.location.pathname,
            'elastic.rum.log.type': 'frustration',
        },
    });
}

function _markActivity() {
    _sawActivity = true;
}

function _onClickEvent(ev) {
    const target = ev.target;
    if (!(target instanceof Element)) {
        return;
    }
    const xpath = xpathForElement(target);
    const ts = Date.now();
    _lastClick = {xpath, ts};
    _recentClicks.push({xpath, ts});
    while (_recentClicks.length && ts - _recentClicks[0].ts > RAGE_WINDOW_MS) {
        _recentClicks.shift();
    }

    const same = _recentClicks.filter((click) => click.xpath === xpath);
    const burstKey = `${xpath}:${same[0]?.ts ?? ts}`;
    if (same.length >= RAGE_THRESHOLD && _rageEmittedForKey !== burstKey) {
        _rageEmittedForKey = burstKey;
        _emit(EVENT_RAGE_CLICK, xpath);
    }

    if (isInteractiveElement(target)) {
        return;
    }

    _sawActivity = false;
    const timer = setTimeout(() => {
        _deadTimers.delete(timer);
        if (!_sawActivity) {
            _emit(EVENT_DEAD_CLICK, xpath);
        }
    }, DEAD_CLICK_MS);
    _deadTimers.add(timer);
}

function _onErrorEvent() {
    const click = _lastClick;
    if (!click || Date.now() - click.ts > ERROR_CLICK_MS) {
        return;
    }
    _emit(EVENT_ERROR_CLICK, click.xpath);
}

/** Start click/error listeners that emit frustration logs. */
export function startFrustration() {
    if (
        _active ||
        typeof window === 'undefined' ||
        typeof document === 'undefined'
    ) {
        return;
    }
    _active = true;
    _onClick = _onClickEvent;
    _onError = _onErrorEvent;
    document.addEventListener('click', _onClick, {
        capture: true,
        passive: true,
    });
    window.addEventListener('error', _onError);
    window.addEventListener('unhandledrejection', _onError);
    window.addEventListener('popstate', _markActivity);
    window.addEventListener('hashchange', _markActivity);
    try {
        _mutObs = new MutationObserver(_markActivity);
        _mutObs.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    } catch (_) {
        _mutObs = null;
    }
}

/** Remove frustration listeners. */
export function stopFrustration() {
    if (_onClick) {
        document.removeEventListener('click', _onClick, {capture: true});
        _onClick = null;
    }
    if (_onError) {
        window.removeEventListener('error', _onError);
        window.removeEventListener('unhandledrejection', _onError);
        _onError = null;
    }
    window.removeEventListener('popstate', _markActivity);
    window.removeEventListener('hashchange', _markActivity);
    if (_mutObs) {
        try {
            _mutObs.disconnect();
        } catch (_) {}
        _mutObs = null;
    }
    for (const timer of _deadTimers) {
        clearTimeout(timer);
    }
    _deadTimers.clear();
    _recentClicks = [];
    _lastClick = null;
    _rageEmittedForKey = '';
    _sawActivity = false;
    _active = false;
}
