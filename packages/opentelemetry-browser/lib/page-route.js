/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {diag, SpanKind} from '@opentelemetry/api';

import {ATTR_URL_TEMPLATE} from './semconv.js';

/**
 * Returns the low-cardinality route of the page at the given URL (e.g.
 * `/product/{id}`), or `undefined` to omit it.
 * @typedef {(url: URL) => string | undefined} PageRouteResolver
 */

/**
 * @typedef {Object} PageRouteManagerOptions
 * @property {() => string | undefined} [getHref] returns the current page URL
 */

// Matches the route part of hash-based routers (`#/cart` or `#!/cart`), so
// plain in-page anchors (`#section`) are not treated as routes.
const HASH_ROUTE_RE = /^#!?\//;
const ID_SEGMENT_RES = [
    // numeric
    /^\d+$/,
    // UUID
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    // hashes and object IDs (e.g. MongoDB)
    /^(?=.*\d)[0-9a-f]{16,}$/i,
    // ULID
    /^[0-7][0-9a-hjkmnp-tv-z]{25}$/i,
];

/**
 * Keeps the route of the current page. A route set with `setRoute` applies
 * until the page path changes, after that the resolver is used.
 */
export class PageRouteManager {
    /** @param {PageRouteManagerOptions} [opts] */
    constructor(opts = {}) {
        this._getHref = opts.getHref ?? (() => globalThis.location?.href);
        /** @type {PageRouteResolver | undefined} */
        this._resolver = undefined;
        /** @type {{pageKey: string | undefined, route: string} | undefined} */
        this._override = undefined;
        /** @type {{href: string, route: string | undefined} | undefined} */
        this._resolved = undefined;
        /** @type {{href: string, pageKey: string | undefined} | undefined} */
        this._lastPage = undefined;
    }

    /** @param {PageRouteResolver | undefined} resolver */
    setResolver(resolver) {
        this._resolver = resolver;
        this._resolved = undefined;
    }

    /**
     * Sets the route of the current page. Passing `undefined` falls back to
     * the resolver.
     * @param {string | undefined} route
     */
    setRoute(route) {
        if (route === undefined || route === '') {
            this._override = undefined;
            return;
        }
        if (typeof route !== 'string') {
            diag.warn(`Invalid page route: ${route}. It must be a string.`);
            return;
        }
        this._override = {pageKey: this._getPageKey(this._getHref()), route};
    }

    /** @returns {string | undefined} */
    getRoute() {
        const href = this._getHref();
        if (this._override) {
            if (this._override.pageKey === this._getPageKey(href)) {
                return this._override.route;
            }
            this._override = undefined;
        }
        const resolver = this._resolver;
        if (!resolver || !href) {
            return undefined;
        }
        // Resolvers are user code so call them once per URL rather than
        // once per span or log record.
        if (this._resolved?.href !== href) {
            this._resolved = {href, route: resolveRoute(resolver, href)};
        }
        return this._resolved.route;
    }

    /**
     * The page is identified by its path and hash route, so query changes and
     * in-page anchors keep the route set by the application.
     * @param {string | undefined} href
     * @returns {string | undefined}
     */
    _getPageKey(href) {
        if (!href) {
            return undefined;
        }
        if (this._lastPage?.href !== href) {
            let pageKey;
            try {
                const url = new URL(href);
                pageKey = url.origin + url.pathname + getHashRoute(url.hash);
            } catch {
                pageKey = href;
            }
            this._lastPage = {href, pageKey};
        }
        return this._lastPage.pageKey;
    }
}

/**
 * Routes are inferred from URLs unless the configuration provides a resolver
 * or turns them off with `false`. Invalid values fall back to the default.
 * @param {PageRouteResolver | false | undefined} pageRoute
 * @returns {PageRouteResolver | undefined}
 */
export function resolvePageRouteConfig(pageRoute) {
    if (pageRoute === false) {
        return undefined;
    }
    if (pageRoute !== undefined && typeof pageRoute !== 'function') {
        diag.warn(
            `Invalid "pageRoute" value: ${pageRoute}. It must be a function or false.`
        );
        return inferPageRoute;
    }
    return pageRoute ?? inferPageRoute;
}

/**
 * Infers a route from the URL by replacing ID-like path segments (numbers,
 * UUIDs, hashes and ULIDs) with `{id}`. The query string is dropped. The
 * route of hash-based routers (`#/cart/123`) is kept.
 * @example inferPageRoute(new URL('https://shop.test/product/123?ref=ad')) // '/product/{id}'
 * @param {URL | string} url
 * @returns {string}
 */
export function inferPageRoute(url) {
    const {pathname, hash} = typeof url === 'string' ? new URL(url) : url;
    return templatePath(pathname) + templatePath(getHashRoute(hash));
}

/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */

/**
 * Adds the page route on span start. Spans that already have a route are
 * left untouched, and so are client spans: on them `url.template` is the
 * template of the request URL, not of the page.
 * @implements {SpanProcessor}
 */
export class PageRouteSpanProcessor {
    /** @param {PageRouteManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {Signal & {kind?: SpanKind}} span */
    onStart(span) {
        if (span.kind !== SpanKind.CLIENT) {
            addRoute(span, this._manager);
        }
    }
    onEnd() {}
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

/**
 * Adds the page route on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class PageRouteLogRecordProcessor {
    /** @param {PageRouteManager} manager */
    constructor(manager) {
        this._manager = manager;
    }
    /** @param {Signal} logRecord */
    onEmit(logRecord) {
        addRoute(logRecord, this._manager);
    }
    forceFlush() {
        return Promise.resolve();
    }
    shutdown() {
        return Promise.resolve();
    }
}

// -- helper functions

/**
 * @typedef {{
 *  attributes: Record<string, unknown>;
 *  setAttribute: (key: string, value: string) => unknown;
 * }} Signal
 */

/**
 * @param {Signal} signal
 * @param {PageRouteManager} manager
 */
function addRoute(signal, manager) {
    if (signal.attributes[ATTR_URL_TEMPLATE] !== undefined) {
        return;
    }
    const route = manager.getRoute();
    if (route !== undefined) {
        signal.setAttribute(ATTR_URL_TEMPLATE, route);
    }
}

/**
 * @param {PageRouteResolver} resolver
 * @param {string} href
 * @returns {string | undefined}
 */
function resolveRoute(resolver, href) {
    try {
        const route = resolver(new URL(href));
        if (route === undefined || typeof route === 'string') {
            return route || undefined;
        }
        diag.warn(`"pageRoute" returned a non-string value: ${route}.`);
    } catch (err) {
        diag.warn(`"pageRoute" failed for ${href}`, err);
    }
    return undefined;
}

/**
 * Returns the hash without its query string if it's a route
 * @param {string} hash
 * @returns {string}
 */
function getHashRoute(hash) {
    return HASH_ROUTE_RE.test(hash) ? hash.split('?')[0] : '';
}

/**
 * @param {string} path
 * @returns {string}
 */
function templatePath(path) {
    return path
        .split('/')
        .map((s) => (ID_SEGMENT_RES.some((re) => re.test(s)) ? '{id}' : s))
        .join('/');
}
