/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    deleteCollector,
    getCollectors,
    upsertCollector,
} from '../storage/collectors.js';
import {getWebsitesByCollectorId} from '../storage.js';

/** @typedef {import('../types/collectors.js').Collector} Collector */

/**
 * @param {HTMLElement} root
 */
export function initCollectorsUi(root) {
    /** @type {HTMLFormElement} */
    const form = /** @type {HTMLFormElement} */ (
        root.querySelector('#collector-form')
    );
    /** @type {HTMLUListElement} */
    const list = /** @type {HTMLUListElement} */ (
        root.querySelector('#collector-list')
    );
    /** @type {HTMLInputElement} */
    const idInput = /** @type {HTMLInputElement} */ (
        root.querySelector('#collector-id')
    );
    /** @type {HTMLButtonElement} */
    const resetBtn = /** @type {HTMLButtonElement} */ (
        root.querySelector('#collector-reset-btn')
    );

    /**
     * @returns {Collector}
     */
    function readForm() {
        const data = new FormData(form);
        const id = String(data.get('id') || '').trim() || crypto.randomUUID();
        return {
            id,
            name: String(data.get('name') || '').trim(),
            url: String(data.get('url') || '').trim(),
            logs_url: String(data.get('logs_url') || '').trim(),
            traces_url: String(data.get('traces_url') || '').trim(),
            api_key: String(data.get('api_key') || '').trim(),
        };
    }

    function clearForm() {
        form.reset();
        idInput.value = '';
    }

    /**
     * @param {Collector} collector
     */
    function fillForm(collector) {
        idInput.value = collector.id;
        /** @type {HTMLInputElement} */ (root.querySelector('#collector-name')).value =
            collector.name;
        /** @type {HTMLInputElement} */ (root.querySelector('#collector-url')).value =
            collector.url;
        /** @type {HTMLInputElement} */ (
            root.querySelector('#collector-logs-url')
        ).value = collector.logs_url;
        /** @type {HTMLInputElement} */ (
            root.querySelector('#collector-traces-url')
        ).value = collector.traces_url;
        /** @type {HTMLInputElement} */ (
            root.querySelector('#collector-api-key')
        ).value = collector.api_key;
    }

    /**
     * @param {Collector[]} collectors
     */
    async function renderList(collectors) {
        list.replaceChildren();
        if (collectors.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'euiListItem euiListItem--empty';
            empty.textContent = 'No collectors configured yet.';
            list.appendChild(empty);
            return;
        }

        for (const collector of collectors) {
            const websites = await getWebsitesByCollectorId(collector.id);

            const item = document.createElement('li');
            item.className = 'euiListItem';

            const header = document.createElement('div');
            header.className = 'site-header';

            const title = document.createElement('div');
            title.className = 'site-host';
            title.textContent = collector.name;

            const count = document.createElement('span');
            count.className = 'euiText euiText--s euiTextColor--subdued';
            count.textContent = `${websites.length} website${
                websites.length === 1 ? '' : 's'
            }`;

            header.append(title, count);

            const meta = document.createElement('div');
            meta.className = 'site-meta';
            meta.textContent = collector.url;

            const actions = document.createElement('div');
            actions.className = 'site-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'euiButton euiButton--empty euiButton--primary';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => fillForm(collector));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'euiButton euiButton--empty euiButton--danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async () => {
                const n = websites.length;
                const detail =
                    n === 0
                        ? `Delete collector “${collector.name}”?`
                        : `Delete collector “${collector.name}” and ${n} linked website${
                              n === 1 ? '' : 's'
                          }?`;
                if (!window.confirm(detail)) {
                    return;
                }
                await deleteCollector(collector.id);
                await refresh();
                void chrome.runtime.sendMessage({type: 'refresh-injections'});
            });

            actions.append(editBtn, deleteBtn);
            item.append(header, meta, actions);
            list.appendChild(item);
        }
    }

    async function refresh() {
        const collectors = await getCollectors();
        await renderList(collectors);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const collector = readForm();
        await upsertCollector(collector);
        clearForm();
        await refresh();
        void chrome.runtime.sendMessage({type: 'refresh-injections'});
    });

    resetBtn.addEventListener('click', () => clearForm());

    return {refresh, clearForm};
}
