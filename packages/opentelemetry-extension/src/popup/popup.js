/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {deleteWebsite, getWebsites, upsertWebsite} from '../storage.js';

/** @typedef {import('../types/websites.js').MonitoredWebsite} MonitoredWebsite */

/** @type {HTMLFormElement} */
const form = /** @type {HTMLFormElement} */ (
    document.getElementById('website-form')
);
/** @type {HTMLUListElement} */
const list = /** @type {HTMLUListElement} */ (
    document.getElementById('website-list')
);
/** @type {HTMLInputElement} */
const idInput = /** @type {HTMLInputElement} */ (
    document.getElementById('website-id')
);
/** @type {HTMLButtonElement} */
const resetBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('reset-btn')
);

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
        endpoint: String(data.get('endpoint') || '').trim(),
        api_key: String(data.get('api_key') || '').trim(),
        service_name: String(data.get('service_name') || '').trim(),
        service_version: String(data.get('service_version') || '').trim(),
    };
}

function clearForm() {
    form.reset();
    idInput.value = '';
}

/**
 * @param {MonitoredWebsite} website
 */
function fillForm(website) {
    idInput.value = website.id;
    /** @type {HTMLInputElement} */ (document.getElementById('host')).value =
        website.host;
    /** @type {HTMLInputElement} */ (document.getElementById('version')).value =
        website.version;
    /** @type {HTMLInputElement} */ (
        document.getElementById('endpoint')
    ).value = website.endpoint;
    /** @type {HTMLInputElement} */ (document.getElementById('api_key')).value =
        website.api_key;
    /** @type {HTMLInputElement} */ (
        document.getElementById('service_name')
    ).value = website.service_name;
    /** @type {HTMLInputElement} */ (
        document.getElementById('service_version')
    ).value = website.service_version;
}

/**
 * @param {MonitoredWebsite[]} websites
 */
function renderList(websites) {
    list.replaceChildren();
    if (websites.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'No websites configured yet.';
        list.appendChild(empty);
        return;
    }

    for (const site of websites) {
        const item = document.createElement('li');

        const host = document.createElement('div');
        host.className = 'site-host';
        host.textContent = site.host;

        const meta = document.createElement('div');
        meta.className = 'site-meta';
        meta.textContent = `${site.service_name} @ ${site.service_version} · EDOT ${site.version}`;

        const actions = document.createElement('div');
        actions.className = 'site-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => fillForm(site));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
            await deleteWebsite(site.id);
            await refresh();
            void chrome.runtime.sendMessage({type: 'refresh-injections'});
        });

        actions.append(editBtn, deleteBtn);
        item.append(host, meta, actions);
        list.appendChild(item);
    }
}

async function refresh() {
    const websites = await getWebsites();
    renderList(websites);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const website = readForm();
    await upsertWebsite(website);
    clearForm();
    await refresh();
    void chrome.runtime.sendMessage({type: 'refresh-injections'});
});

resetBtn.addEventListener('click', () => clearForm());

void refresh();
