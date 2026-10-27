/**
 * Routes are inferred from URLs unless the configuration provides a resolver
 * or turns them off with `false`. Invalid values fall back to the default.
 * @param {PageRouteResolver | false | undefined} pageRoute
 * @returns {PageRouteResolver | undefined}
 */
export function resolvePageRouteConfig(pageRoute: PageRouteResolver | false | undefined): PageRouteResolver | undefined;
/**
 * Infers a route from the URL by replacing ID-like path segments (numbers,
 * UUIDs, hashes and ULIDs) with `{id}`. The query string is dropped. The
 * route of hash-based routers (`#/cart/123`) is kept.
 * @example inferPageRoute(new URL('https://shop.test/product/123?ref=ad')) // '/product/{id}'
 * @param {URL | string} url
 * @returns {string}
 */
export function inferPageRoute(url: URL | string): string;
/**
 * Keeps the route of the current page. A route set with `setRoute` applies
 * until the page path changes, after that the resolver is used.
 */
export class PageRouteManager {
    /** @param {PageRouteManagerOptions} [opts] */
    constructor(opts?: PageRouteManagerOptions);
    _getHref: () => string | undefined;
    /** @type {PageRouteResolver | undefined} */
    _resolver: PageRouteResolver | undefined;
    /** @type {{pageKey: string | undefined, route: string} | undefined} */
    _override: {
        pageKey: string | undefined;
        route: string;
    } | undefined;
    /** @type {{href: string, route: string | undefined} | undefined} */
    _resolved: {
        href: string;
        route: string | undefined;
    } | undefined;
    /** @type {{href: string, pageKey: string | undefined} | undefined} */
    _lastPage: {
        href: string;
        pageKey: string | undefined;
    } | undefined;
    /** @param {PageRouteResolver | undefined} resolver */
    setResolver(resolver: PageRouteResolver | undefined): void;
    /**
     * Sets the route of the current page. Passing `undefined` falls back to
     * the resolver.
     * @param {string | undefined} route
     */
    setRoute(route: string | undefined): void;
    /** @returns {string | undefined} */
    getRoute(): string | undefined;
    /**
     * The page is identified by its path and hash route, so query changes and
     * in-page anchors keep the route set by the application.
     * @param {string | undefined} href
     * @returns {string | undefined}
     */
    _getPageKey(href: string | undefined): string | undefined;
}
/** @typedef {import('@opentelemetry/sdk-trace').SpanProcessor} SpanProcessor */
/**
 * Adds the page route on span start. Spans that already have a route are
 * left untouched.
 * @implements {SpanProcessor}
 */
export class PageRouteSpanProcessor implements SpanProcessor {
    /** @param {PageRouteManager} manager */
    constructor(manager: PageRouteManager);
    _manager: PageRouteManager;
    /** @param {Signal} span */
    onStart(span: Signal): void;
    onEnd(): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Adds the page route on log emit. Must be registered before exporting
 * processors since records become read-only after all `onEmit` calls.
 */
export class PageRouteLogRecordProcessor {
    /** @param {PageRouteManager} manager */
    constructor(manager: PageRouteManager);
    _manager: PageRouteManager;
    /** @param {Signal} logRecord */
    onEmit(logRecord: Signal): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
export type Signal = {
    attributes: Record<string, unknown>;
    setAttribute: (key: string, value: string) => unknown;
};
/**
 * Returns the low-cardinality route of the page at the given URL (e.g.
 * `/product/{id}`), or `undefined` to omit it.
 */
export type PageRouteResolver = (url: URL) => string | undefined;
export type PageRouteManagerOptions = {
    /**
     * returns the current page URL
     */
    getHref?: (() => string | undefined) | undefined;
};
export type SpanProcessor = import("@opentelemetry/sdk-trace").SpanProcessor;
