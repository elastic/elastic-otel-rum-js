/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {getCollectors} from '../storage/collectors.js';
import {deleteWebsite, getWebsites, upsertWebsite} from '../storage.js';

/** @typedef {import('../types/collectors.js').Collector} Collector */
/** @typedef {import('../types/websites.js').MonitoredWebsite} MonitoredWebsite */
/** @typedef {import('../types/websites.js').InjectionStatus} InjectionStatus */

/**
 * @param {HTMLElement} root
 * @param {{onNeedCollectors?: () => void}} [options]
 */
export function initWebsitesUi(root, options = {}) {
    /** @type {HTMLFormElement} */
    const form = /** @type {HTMLFormElement} */ (
        root.querySelector('#website-form')
    );
    /** @type {HTMLUListElement} */
    const list = /** @type {HTMLUListElement} */ (
        root.querySelector('#website-list')
    );
    /** @type {HTMLInputElement} */
    const idInput = /** @type {HTMLInputElement} */ (
        root.querySelector('#website-id')
    );
    /** @type {HTMLSelectElement} */
    const collectorSelect = /** @type {HTMLSelectElement} */ (
        root.querySelector('#collector-id-select')
    );
    /** @type {HTMLButtonElement} */
    const resetBtn = /** @type {HTMLButtonElement} */ (
        root.querySelector('#website-reset-btn')
    );
    /** @type {HTMLParagraphElement | null} */
    const noCollectorsHint = root.querySelector('#no-collectors-hint');

    /** @type {Map<string, Collector>} */
    let collectorsById = new Map();

    /**
     * @param {Collector[]} collectors
     * @param {string} [selectedId]
     */
    function populateCollectorSelect(collectors, selectedId) {
        collectorsById = new Map(collectors.map((c) => [c.id, c]));
        collectorSelect.replaceChildren();

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent =
            collectors.length === 0
                ? 'Create a collector first'
                : 'Select a collector';
        placeholder.disabled = true;
        placeholder.selected = !selectedId;
        collectorSelect.appendChild(placeholder);

        for (const collector of collectors) {
            const option = document.createElement('option');
            option.value = collector.id;
            option.textContent = collector.name;
            if (collector.id === selectedId) {
                option.selected = true;
            }
            collectorSelect.appendChild(option);
        }

        const hasCollectors = collectors.length > 0;
        collectorSelect.disabled = !hasCollectors;
        form.querySelectorAll('input').forEach((input) => {
            if (input.id === 'website-id') {
                return;
            }
            input.disabled = !hasCollectors;
        });
        /** @type {HTMLButtonElement | null} */
        const saveBtn = root.querySelector('#website-save-btn');
        if (saveBtn) {
            saveBtn.disabled = !hasCollectors;
        }
        if (noCollectorsHint) {
            noCollectorsHint.hidden = hasCollectors;
        }
    }

    /**
     * @returns {MonitoredWebsite}
     */
    function readForm() {
        const data = new FormData(form);
        const id = String(data.get('id') || '').trim() || crypto.randomUUID();
        return {
            id,
            host: String(data.get('host') || '').trim(),
            version: String(data.get('version') || '').trim(),
            collector_id: String(data.get('collector_id') || '').trim(),
            service_name: String(data.get('service_name') || '').trim(),
            service_version: String(data.get('service_version') || '').trim(),
        };
    }

    function clearForm() {
        form.reset();
        idInput.value = '';
        populateCollectorSelect([...collectorsById.values()], '');
    }

    /**
     * @param {MonitoredWebsite} website
     */
    function fillForm(website) {
        idInput.value = website.id;
        populateCollectorSelect(
            [...collectorsById.values()],
            website.collector_id
        );
        /** @type {HTMLInputElement} */ (root.querySelector('#host')).value =
            website.host;
        /** @type {HTMLInputElement} */ (root.querySelector('#version')).value =
            website.version;
        /** @type {HTMLInputElement} */ (
            root.querySelector('#service_name')
        ).value = website.service_name;
        /** @type {HTMLInputElement} */ (
            root.querySelector('#service_version')
        ).value = website.service_version;
    }

    /**
     * @param {InjectionStatus | undefined} status
     * @returns {{label: string, healthClass: string}}
     */
    function describeInjectionDisplay(status) {
        switch (status) {
            case 'active':
                return {label: 'Injected', healthClass: 'euiHealth--success'};
            case 'failed':
                return {label: 'Failed', healthClass: 'euiHealth--danger'};
            default:
                return {
                    label: 'Not checked',
                    healthClass: 'euiHealth--subdued',
                };
        }
    }

    /**
     * @param {MonitoredWebsite[]} websites
     */
    function renderList(websites) {
        list.replaceChildren();
        if (websites.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'euiListItem euiListItem--empty';
            empty.textContent = 'No websites configured yet.';
            list.appendChild(empty);
            return;
        }

        for (const site of websites) {
            const collector = collectorsById.get(site.collector_id);
            const collectorLabel = collector
                ? collector.name
                : 'Unknown collector';

            const item = document.createElement('li');
            item.className = 'euiListItem';

            const header = document.createElement('div');
            header.className = 'site-header';

            const host = document.createElement('div');
            host.className = 'site-host';
            host.textContent = site.host;

            const {label, healthClass} = describeInjectionDisplay(
                site.injection_status
            );
            const health = document.createElement('span');
            health.className = `euiHealth ${healthClass}`;
            health.setAttribute('role', 'status');
            health.textContent = label;

            header.append(host, health);

            const meta = document.createElement('div');
            meta.className = 'site-meta';
            meta.textContent = `${site.service_name} @ ${site.service_version} · EDOT ${site.version} · ${collectorLabel}`;

            const actions = document.createElement('div');
            actions.className = 'site-actions';

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'euiButton euiButton--empty euiButton--primary';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => fillForm(site));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className =
                'euiButton euiButton--empty euiButton--danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async () => {
                await deleteWebsite(site.id);
                await refresh();
                void chrome.runtime.sendMessage({type: 'refresh-injections'});
            });

            actions.append(editBtn, deleteBtn);
            item.append(header, meta);

            if (site.injection_status === 'failed' && site.injection_message) {
                const statusDetail = document.createElement('p');
                statusDetail.className = 'site-injection-detail';
                statusDetail.textContent = site.injection_message;
                item.append(statusDetail);
            }

            item.append(actions);
            list.appendChild(item);
        }
    }

    async function refresh() {
        const [websites, collectors] = await Promise.all([
            getWebsites(),
            getCollectors(),
        ]);
        const selected =
            collectorSelect.value ||
            (idInput.value
                ? websites.find((w) => w.id === idInput.value)?.collector_id
                : '');
        populateCollectorSelect(collectors, selected || '');
        renderList(websites);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const website = readForm();
            await upsertWebsite(website);
            clearForm();
            await refresh();
            void chrome.runtime.sendMessage({type: 'refresh-injections'});
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Could not save website.';
            window.alert(message);
        }
    });

    resetBtn.addEventListener('click', () => clearForm());

    if (noCollectorsHint) {
        const link = noCollectorsHint.querySelector('[data-switch-tab]');
        link?.addEventListener('click', (event) => {
            event.preventDefault();
            options.onNeedCollectors?.();
        });
    }

    return {refresh};
}
