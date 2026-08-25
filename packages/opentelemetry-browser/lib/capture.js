/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {{depth?: number, rules?: string[]}} UrlGroupingConfig
 */

/**
 * @typedef {Object} CaptureConfiguration
 * @property {Array<string|RegExp>} [ignoreUrls]
 * @property {UrlGroupingConfig} [urlGrouping]
 * @property {(signal: {kind: 'span'|'log', attributes: Record<string, unknown>}) => boolean|void} [beforeSend]
 * @property {boolean} [graphql]
 */

/** Attribute stamped so gated exporters can drop a signal without sending it. */
export const DROP_ATTR = 'elastic.internal.drop';

/** @type {CaptureConfiguration} */
let _config = {};

let _paused = false;

/** @type {{id: string, name: string} | null} */
let _lastAction = null;

/**
 * @param {CaptureConfiguration | undefined} cfg
 */
export function configureCapture(cfg) {
    _config = cfg && typeof cfg === 'object' ? cfg : {};
}

/** @returns {CaptureConfiguration} */
export function getCaptureConfig() {
    return _config;
}

export function isPaused() {
    return _paused;
}

export function pauseCapture() {
    _paused = true;
}

export function resumeCapture() {
    _paused = false;
}

/**
 * @param {string} id
 * @param {string} [name]
 */
export function setLastUserAction(id, name) {
    if (!id) {
        return;
    }
    _lastAction = {id, name: name ?? id};
}

export function getLastUserAction() {
    return _lastAction;
}

export function clearLastUserAction() {
    _lastAction = null;
}

/**
 * @param {string} [url]
 * @returns {boolean}
 */
export function matchesIgnoreUrl(url) {
    if (!url || !_config.ignoreUrls?.length) {
        return false;
    }
    for (const pattern of _config.ignoreUrls) {
        if (typeof pattern === 'string') {
            if (url.includes(pattern)) {
                return true;
            }
            continue;
        }
        if (pattern instanceof RegExp && pattern.test(url)) {
            return true;
        }
    }
    return false;
}

/**
 * Convert capture.ignoreUrls into the string|RegExp list fetch/XHR expect.
 * @param {Array<string|RegExp>|undefined} patterns
 * @returns {Array<string|RegExp>}
 */
export function toIgnoreUrlList(patterns) {
    if (!Array.isArray(patterns)) {
        return [];
    }
    return patterns.filter(
        (p) => typeof p === 'string' || p instanceof RegExp
    );
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_RE = /^[0-9a-f]{16,}$/i;
const NUM_ID_RE = /^\d{4,}$/;

/**
 * @param {string} segment
 * @returns {boolean}
 */
export function looksLikeId(segment) {
    if (!segment) {
        return false;
    }
    return UUID_RE.test(segment) || HEX_ID_RE.test(segment) || NUM_ID_RE.test(segment);
}

/**
 * @param {string} path
 * @param {string} pattern glob like `/user/*`
 * @returns {string | null}
 */
function applyGlobRule(path, pattern) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (patternParts.length === 0 || pathParts.length < patternParts.length) {
        return null;
    }
    /** @type {string[]} */
    const out = [];
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '*') {
            out.push('*');
        } else if (patternParts[i] === pathParts[i]) {
            out.push(pathParts[i]);
        } else {
            return null;
        }
    }
    for (let i = patternParts.length; i < pathParts.length; i++) {
        out.push(looksLikeId(pathParts[i]) ? '*' : pathParts[i]);
    }
    return `/${out.join('/')}`;
}

/**
 * Collapse high-cardinality URL paths for grouping.
 *
 * @param {string} path
 * @param {UrlGroupingConfig | undefined} grouping
 * @returns {string}
 */
export function groupUrlPath(path, grouping = _config.urlGrouping) {
    if (!path) {
        return path;
    }
    let normalized = path;
    try {
        if (path.includes('://')) {
            normalized = new URL(path).pathname;
        }
    } catch {
        normalized = path.split('?')[0] ?? path;
    }
    const hash = normalized.indexOf('#');
    if (hash >= 0) {
        const frag = normalized.slice(hash + 1);
        if (frag.startsWith('/')) {
            normalized = frag.split('?')[0] ?? frag;
        }
    }
    const q = normalized.indexOf('?');
    if (q >= 0) {
        normalized = normalized.slice(0, q);
    }
    if (!normalized.startsWith('/')) {
        return normalized;
    }

    const rules = grouping?.rules ?? [];
    for (const rule of rules) {
        if (typeof rule !== 'string' || !rule) {
            continue;
        }
        const grouped = applyGlobRule(normalized, rule);
        if (grouped) {
            return grouped;
        }
    }

    const depth = grouping?.depth;
    const parts = normalized.split('/').filter(Boolean);
    const mapped = parts.map((seg) => (looksLikeId(seg) ? ':id' : seg));
    if (typeof depth === 'number' && depth > 0 && mapped.length > depth) {
        return `/${mapped.slice(0, depth).join('/')}/*`;
    }
    return `/${mapped.join('/')}`;
}

/**
 * @returns {Record<string, string>}
 */
export function currentPageAttributes() {
    if (typeof location === 'undefined') {
        return {};
    }
    const href = location.href;
    const path = location.pathname || '/';
    const grouped = groupUrlPath(path);
    /** @type {Record<string, string>} */
    const attrs = {
        'page.url': href,
        'page.url.path': path,
        'url.path.grouped': grouped,
    };
    if (location.hash) {
        attrs['page.url.hash'] = location.hash;
    }
    return attrs;
}

/**
 * @returns {Record<string, string>}
 */
export function lastActionAttributes() {
    if (!_lastAction) {
        return {};
    }
    /** @type {Record<string, string>} */
    const attrs = {'user_action.id': _lastAction.id};
    if (_lastAction.name) {
        attrs['user_action.name'] = _lastAction.name;
    }
    return attrs;
}

/**
 * @param {'span'|'log'} kind
 * @param {Record<string, unknown>} attributes
 * @returns {boolean} false when the signal should be dropped
 */
export function applyBeforeSend(kind, attributes) {
    const hook = _config.beforeSend;
    if (typeof hook !== 'function') {
        return true;
    }
    try {
        const result = hook({kind, attributes});
        return result !== false;
    } catch {
        return true;
    }
}

/**
 * Serialize a non-Error promise rejection into a short message.
 *
 * @param {unknown} reason
 * @returns {string}
 */
export function serializeRejection(reason) {
    if (reason == null) {
        return 'unhandled rejection';
    }
    if (typeof reason === 'string') {
        return reason.slice(0, 500);
    }
    if (reason instanceof Error) {
        return reason.message || reason.name || 'Error';
    }
    if (typeof reason === 'object') {
        const rec = /** @type {Record<string, unknown>} */ (reason);
        if (typeof rec.message === 'string' && rec.message) {
            return rec.message.slice(0, 500);
        }
        try {
            return JSON.stringify(reason).slice(0, 500);
        } catch {
            return Object.prototype.toString.call(reason);
        }
    }
    return String(reason).slice(0, 500);
}

/**
 * Opt-in GraphQL operation from a JSON body or URL.
 *
 * @param {unknown} body
 * @param {string} [url]
 * @returns {{name: string, type: string} | null}
 */
export function parseGraphqlOperation(body, url) {
    if (!_config.graphql) {
        return null;
    }
    if (typeof body === 'string' && body.trim().startsWith('{')) {
        try {
            const json = JSON.parse(body);
            const query = typeof json.query === 'string' ? json.query : '';
            const opName =
                typeof json.operationName === 'string' ? json.operationName : '';
            if (query) {
                const match = query.match(
                    /\b(query|mutation|subscription)\s+(\w+)/
                );
                if (match) {
                    return {type: match[1], name: opName || match[2]};
                }
                const kind = query.match(/\b(query|mutation|subscription)\b/);
                if (kind) {
                    return {type: kind[1], name: opName || 'anonymous'};
                }
            }
            if (opName) {
                return {type: 'query', name: opName};
            }
        } catch {
            // not JSON GraphQL
        }
    }
    if (typeof url === 'string') {
        const fromQuery = /[?&]operationName=([^&]+)/.exec(url);
        if (fromQuery?.[1]) {
            try {
                return {
                    type: 'query',
                    name: decodeURIComponent(fromQuery[1]),
                };
            } catch {
                return {type: 'query', name: fromQuery[1]};
            }
        }
    }
    return null;
}

/**
 * GraphQL op from fetch Request / RequestInit headers or body.
 *
 * @param {Request | RequestInit | undefined} request
 * @param {string} [url]
 * @returns {{name: string, type: string} | null}
 */
export function graphqlFromFetchRequest(request, url) {
    if (!_config.graphql || !request) {
        return fromGraphqlHeaders(undefined, url);
    }
    /** @type {Headers | Record<string, string> | string[][] | undefined} */
    let headers;
    /** @type {unknown} */
    let body;
    if (typeof Request !== 'undefined' && request instanceof Request) {
        headers = request.headers;
        url = url ?? request.url;
        // Body may already be locked; skip reading it.
    } else {
        const init = /** @type {RequestInit} */ (request);
        headers = /** @type {Headers | Record<string, string> | undefined} */ (
            init.headers
        );
        body = init.body;
        if (typeof init.url === 'string') {
            url = url ?? init.url;
        }
    }
    const fromHeader = fromGraphqlHeaders(headers, url);
    if (fromHeader) {
        return fromHeader;
    }
    return parseGraphqlOperation(body, url);
}

/**
 * @param {Headers | Record<string, string> | string[][] | undefined} headers
 * @param {string} [url]
 * @returns {{name: string, type: string} | null}
 */
function fromGraphqlHeaders(headers, url) {
    const name =
        headerValue(headers, 'graphql-operation') ||
        headerValue(headers, 'x-apollo-operation-name') ||
        headerValue(headers, 'x-gql-operation-name');
    if (name) {
        return {type: 'query', name};
    }
    return parseGraphqlOperation(undefined, url);
}

/**
 * @param {Headers | Record<string, string> | string[][] | undefined} headers
 * @param {string} name
 * @returns {string | undefined}
 */
function headerValue(headers, name) {
    if (!headers) {
        return undefined;
    }
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        return headers.get(name) ?? undefined;
    }
    if (Array.isArray(headers)) {
        const found = headers.find(
            (pair) => pair[0]?.toLowerCase() === name.toLowerCase()
        );
        return found?.[1];
    }
    const rec = /** @type {Record<string, string>} */ (headers);
    const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? rec[key] : undefined;
}

/**
 * Parse `data-*` attributes from a script tag into SDK config.
 *
 * @param {DOMStringMap} dataset
 * @returns {Record<string, unknown>}
 */
export function configFromScriptDataset(dataset) {
    /** @type {Record<string, unknown>} */
    const cfg = {};
    if (dataset.otlpEndpoint) {
        cfg.otlpEndpoint = dataset.otlpEndpoint;
    }
    if (dataset.serviceName) {
        cfg.serviceName = dataset.serviceName;
    }
    if (dataset.serviceVersion) {
        cfg.serviceVersion = dataset.serviceVersion;
    }
    if (dataset.sampleRate) {
        const rate = Number(dataset.sampleRate);
        if (Number.isFinite(rate)) {
            cfg.sampleRate = rate > 1 ? rate / 100 : rate;
        }
    }
    if (dataset.replayEnabled === 'true') {
        cfg.replay = {enabled: true};
    }
    /** @type {CaptureConfiguration} */
    const capture = {};
    if (dataset.ignoreUrls) {
        capture.ignoreUrls = dataset.ignoreUrls
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    if (dataset.urlGroupingDepth) {
        const depth = Number(dataset.urlGroupingDepth);
        if (Number.isFinite(depth) && depth > 0) {
            capture.urlGrouping = {depth};
        }
    }
    if (dataset.graphql === 'true') {
        capture.graphql = true;
    }
    if (Object.keys(capture).length > 0) {
        cfg.capture = capture;
    }
    return cfg;
}
