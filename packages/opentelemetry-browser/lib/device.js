/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {number} width
 * @returns {'xs'|'s'|'m'|'l'|'xl'}
 */
export function breakpointBand(width) {
    if (width < 576) {
        return 'xs';
    }
    if (width < 768) {
        return 's';
    }
    if (width < 992) {
        return 'm';
    }
    if (width < 1200) {
        return 'l';
    }
    return 'xl';
}

/**
 * Viewport / connection / memory — values can change during a session so they
 * are stamped per span/log rather than on the immutable Resource.
 *
 * @returns {Record<string, string | number>}
 */
export function currentDeviceAttributes() {
    /** @type {Record<string, string | number>} */
    const attrs = {};
    if (typeof window !== 'undefined') {
        attrs['browser.viewport.width'] = window.innerWidth;
        attrs['browser.viewport.height'] = window.innerHeight;
        if (typeof window.devicePixelRatio === 'number') {
            attrs['browser.pixel_ratio'] = window.devicePixelRatio;
        }
        attrs['browser.breakpoint'] = breakpointBand(window.innerWidth);
    }
    if (typeof navigator === 'undefined') {
        return attrs;
    }
    const nav = /** @type {Navigator & {connection?: {effectiveType?: string, type?: string}, mozConnection?: {effectiveType?: string, type?: string}, webkitConnection?: {effectiveType?: string, type?: string}, deviceMemory?: number}} */ (
        navigator
    );
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (conn?.effectiveType) {
        attrs['network.connection.type'] = conn.effectiveType;
    }
    if (conn?.type) {
        attrs['network.connection.tech'] = conn.type;
    }
    if (typeof nav.deviceMemory === 'number') {
        attrs['device.memory'] = nav.deviceMemory;
    }
    return attrs;
}
