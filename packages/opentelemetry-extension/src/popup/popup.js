/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {initCollectorsUi} from './collectors-ui.js';
import {initWebsitesUi} from './websites-ui.js';

/** @type {'collectors' | 'websites'} */
let activeTab = 'websites';

/** @type {HTMLElement} */
const panelCollectors = /** @type {HTMLElement} */ (
    document.getElementById('panel-collectors')
);
/** @type {HTMLElement} */
const panelWebsites = /** @type {HTMLElement} */ (
    document.getElementById('panel-websites')
);
/** @type {HTMLButtonElement} */
const tabCollectors = /** @type {HTMLButtonElement} */ (
    document.getElementById('tab-collectors')
);
/** @type {HTMLButtonElement} */
const tabWebsites = /** @type {HTMLButtonElement} */ (
    document.getElementById('tab-websites')
);

const collectorsUi = initCollectorsUi(panelCollectors);
const websitesUi = initWebsitesUi(panelWebsites, {
    onNeedCollectors: () => setActiveTab('collectors'),
});

/**
 * @param {'collectors' | 'websites'} tab
 */
function setActiveTab(tab) {
    activeTab = tab;
    const isCollectors = tab === 'collectors';
    panelCollectors.hidden = !isCollectors;
    panelWebsites.hidden = isCollectors;
    tabCollectors.classList.toggle('euiTab--selected', isCollectors);
    tabWebsites.classList.toggle('euiTab--selected', !isCollectors);
    tabCollectors.setAttribute('aria-selected', String(isCollectors));
    tabWebsites.setAttribute('aria-selected', String(!isCollectors));
}

tabCollectors.addEventListener('click', () => {
    setActiveTab('collectors');
    void collectorsUi.refresh();
});

tabWebsites.addEventListener('click', () => {
    setActiveTab('websites');
    void websitesUi.refresh();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
        return;
    }
    if (changes.collectors) {
        void collectorsUi.refresh();
        void websitesUi.refresh();
    }
    if (changes.monitoredWebsites) {
        void websitesUi.refresh();
    }
});

setActiveTab('websites');
void collectorsUi.refresh();
void websitesUi.refresh();
