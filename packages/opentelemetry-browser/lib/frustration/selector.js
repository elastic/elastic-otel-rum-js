/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Same format as `browser.css_selector` of the `user-action` instrumentation,
 * so frustration events can be matched with clicks.
 * @param {Element} element
 * @returns {string}
 */
export function cssSelector(element) {
    /** @type {string[]} */
    const parts = [];
    /** @type {Element | null} */
    let el = element;
    while (el) {
        const id = el.getAttribute('id');
        if (
            id &&
            el.ownerDocument.querySelectorAll(`#${CSS.escape(id)}`).length === 1
        ) {
            parts.unshift(`#${CSS.escape(id)}`);
            break;
        }
        const classes = classSelector(el);
        /** @type {Element | null} */
        const parent = el.parentElement;
        const siblings = parent
            ? Array.from(parent.children).filter(
                  (s) => classSelector(s) === classes
              )
            : [];
        parts.unshift(
            siblings.length > 1
                ? `${classes}:nth-child(${siblings.indexOf(el) + 1})`
                : classes
        );
        el = parent;
    }
    return parts.join(' > ');
}

/** @param {Element} el */
function classSelector(el) {
    return (
        el.localName +
        Array.from(el.classList, (c) => `.${CSS.escape(c)}`).join('')
    );
}
