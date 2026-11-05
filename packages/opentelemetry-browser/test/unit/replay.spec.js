/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {mock, test} from 'node:test';

import {diag, DiagLogLevel} from '@opentelemetry/api';

import {resolveReplayConfig} from '../../lib/replay/config.js';
import {
    REPLAY_SCOPE_NAME,
    startReplay,
    toRecordPrivacyOptions,
} from '../../lib/replay/recorder.js';
import {EDOT_VERSION} from '../../lib/version.js';

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEFAULT_PRIVACY = {maskAllInputs: true, maskAllText: true};

/**
 * @param {import('node:test').TestContext} t
 * @returns {string[]}
 */
function captureWarnings(t) {
    /** @type {string[]} */
    const warnings = [];
    const noop = () => {};
    diag.setLogger(
        {
            error: noop,
            warn: (msg) => warnings.push(msg),
            info: noop,
            debug: noop,
            verbose: noop,
        },
        DiagLogLevel.WARN
    );
    t.after(() => diag.disable());
    return warnings;
}

/**
 * @param {{sampled?: boolean}} [opts]
 */
function setup(opts = {}) {
    const session = {
        id: '6f1c2e7a-0d3b-4c55-9a8e-2b7f9e0c1d34',
        startTimestamp: 0,
        lastActivityTimestamp: 0,
        sampled: opts.sampled ?? true,
        samplingRate: 1,
    };
    const sessionManager = {
        getSession: () => session,
        getTabId: () => 'b2e4d7c1-5a6f-4e3b-8c9d-0a1b2c3d4e5f',
    };
    const stop = mock.fn();
    /** @type {((event: any) => void) | undefined} */
    let emit;
    const record = mock.fn((/** @type {any} */ options) => {
        emit = options.emit;
        return stop;
    });
    // `InMemoryLogRecordExporter` drops its records on shutdown
    /** @type {import('@opentelemetry/sdk-logs').ReadableLogRecord[]} */
    const exported = [];
    const exporter = {
        export: (
            /** @type {any[]} */ records,
            /** @type {(r: {code: number}) => void} */ cb
        ) => {
            exported.push(...records);
            cb({code: 0});
        },
        shutdown: () => Promise.resolve(),
    };
    /** @param {Partial<import('../../lib/replay/config.js').ResolvedReplayConfig>} [config] */
    const start = (config) =>
        startReplay({
            config: {enabled: true, privacy: DEFAULT_PRIVACY, ...config},
            sessionManager,
            resourceAttributes: {'service.name': 'replay-test'},
            exportConfig: {url: 'http://localhost:4318/v1/logs'},
            record,
            exporter,
        });
    return {
        session,
        sessionManager,
        record,
        stop,
        exported,
        start,
        emit: (/** @type {any} */ event) => emit?.(event),
    };
}

test('resolveReplayConfig - is disabled with privacy defaults when not set', (t) => {
    const warnings = captureWarnings(t);
    for (const hasRecorder of [true, false]) {
        assert.deepStrictEqual(resolveReplayConfig(undefined, hasRecorder), {
            enabled: false,
            privacy: DEFAULT_PRIVACY,
        });
    }
    assert.deepStrictEqual(warnings, []);
});

test('resolveReplayConfig - warns and disables replay on the core entry point', (t) => {
    const warnings = captureWarnings(t);
    const resolved = resolveReplayConfig({enabled: true}, false);
    assert.strictEqual(resolved.enabled, false);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /@elastic\/opentelemetry-browser\/replay/);
});

test('resolveReplayConfig - keeps valid values', (t) => {
    const warnings = captureWarnings(t);
    const maskInputFn = (/** @type {string} */ text) => text;
    const maskTextFn = (/** @type {string} */ text) => text;
    const resolved = resolveReplayConfig(
        {
            enabled: true,
            privacy: {
                maskAllInputs: false,
                maskAllText: false,
                maskInputOptions: {password: true, email: true},
                maskTextSelector: '.name',
                blockSelector: '.payment',
                ignoreSelector: '.search',
                maskInputFn,
                maskTextFn,
            },
        },
        true
    );
    assert.deepStrictEqual(resolved, {
        enabled: true,
        privacy: {
            maskAllInputs: false,
            maskAllText: false,
            maskInputOptions: {password: true, email: true},
            maskTextSelector: '.name',
            blockSelector: '.payment',
            ignoreSelector: '.search',
            maskInputFn,
            maskTextFn,
        },
    });
    assert.deepStrictEqual(warnings, []);
});

test('resolveReplayConfig - falls back to defaults on invalid values', (t) => {
    const warnings = captureWarnings(t);
    assert.deepStrictEqual(resolveReplayConfig(true, true), {
        enabled: false,
        privacy: DEFAULT_PRIVACY,
    });
    assert.deepStrictEqual(
        resolveReplayConfig({enabled: 'yes', privacy: 'strict'}, true),
        {enabled: false, privacy: DEFAULT_PRIVACY}
    );
    assert.deepStrictEqual(
        resolveReplayConfig(
            {
                enabled: true,
                privacy: {
                    maskAllInputs: 0,
                    maskAllText: 'no',
                    maskInputFn: 'fn',
                    maskTextFn: {},
                },
            },
            true
        ),
        {enabled: true, privacy: DEFAULT_PRIVACY}
    );
    assert.strictEqual(warnings.length, 7);
});

test('resolveReplayConfig - disables replay on invalid selectors or input options', (t) => {
    const warnings = captureWarnings(t);
    const invalid = [
        {maskInputOptions: ['password']},
        {maskTextSelector: ''},
        {blockSelector: 42},
        {ignoreSelector: null},
    ];
    for (const privacy of invalid) {
        const resolved = resolveReplayConfig({enabled: true, privacy}, true);
        assert.strictEqual(resolved.enabled, false, JSON.stringify(privacy));
    }
    assert.strictEqual(warnings.length, invalid.length);
});

test('resolveReplayConfig - disables replay on selectors the DOM rejects', (t) => {
    const warnings = captureWarnings(t);
    // Minimal DOM stand in: commas at the end are a syntax error
    globalThis.document = /** @type {any} */ ({
        createDocumentFragment: () => ({
            querySelector: (/** @type {string} */ sel) => {
                if (sel.trim().endsWith(',')) {
                    throw new SyntaxError(sel);
                }
                return null;
            },
        }),
    });
    t.after(() => {
        delete globalThis.document;
    });
    const config = (/** @type {string} */ blockSelector) =>
        resolveReplayConfig({enabled: true, privacy: {blockSelector}}, true);
    assert.strictEqual(config('.payment-form').enabled, true);
    assert.strictEqual(config('.payment-form,').enabled, false);
    assert.strictEqual(warnings.length, 1);
});

test('toRecordPrivacyOptions - masks all text by default', () => {
    assert.deepStrictEqual(toRecordPrivacyOptions(DEFAULT_PRIVACY), {
        maskAllInputs: true,
        maskInputOptions: undefined,
        maskInputFn: undefined,
        maskTextFn: undefined,
        maskTextSelector: '*',
        blockSelector: '[data-elastic-replay="block"]',
        ignoreSelector: '[data-elastic-replay="ignore"]',
    });
    const options = toRecordPrivacyOptions({
        ...DEFAULT_PRIVACY,
        maskTextSelector: '.name',
    });
    assert.strictEqual(options.maskTextSelector, '*');
});

test('toRecordPrivacyOptions - keeps password masking with maskInputOptions', () => {
    const options = (/** @type {Record<string, boolean>} */ opts) =>
        toRecordPrivacyOptions({
            ...DEFAULT_PRIVACY,
            maskAllInputs: false,
            maskInputOptions: opts,
        }).maskInputOptions;
    assert.deepStrictEqual(options({email: true}), {
        password: true,
        email: true,
    });
    assert.deepStrictEqual(options({password: false}), {password: false});
});

test('toRecordPrivacyOptions - always applies the data-elastic-replay selectors', () => {
    assert.deepStrictEqual(
        toRecordPrivacyOptions({...DEFAULT_PRIVACY, maskAllText: false}),
        {
            maskAllInputs: true,
            maskInputOptions: undefined,
            maskInputFn: undefined,
            maskTextFn: undefined,
            maskTextSelector: '[data-elastic-replay="mask"]',
            blockSelector: '[data-elastic-replay="block"]',
            ignoreSelector: '[data-elastic-replay="ignore"]',
        }
    );
    const options = toRecordPrivacyOptions({
        ...DEFAULT_PRIVACY,
        maskAllText: false,
        maskTextSelector: '.name',
        blockSelector: '.payment',
        ignoreSelector: '.search',
    });
    assert.strictEqual(
        options.maskTextSelector,
        '[data-elastic-replay="mask"], .name'
    );
    assert.strictEqual(
        options.blockSelector,
        '[data-elastic-replay="block"], .payment'
    );
    assert.strictEqual(
        options.ignoreSelector,
        '[data-elastic-replay="ignore"], .search'
    );
});

test('startReplay - never starts the recorder when disabled', () => {
    const {start, record} = setup();
    assert.strictEqual(start({enabled: false}), undefined);
    assert.strictEqual(record.mock.callCount(), 0);
});

test('startReplay - never starts the recorder without sessions', (t) => {
    const warnings = captureWarnings(t);
    const {record} = setup();
    const replay = startReplay({
        config: {enabled: true, privacy: DEFAULT_PRIVACY},
        resourceAttributes: {},
        exportConfig: {url: 'http://localhost:4318/v1/logs'},
        record,
    });
    assert.strictEqual(replay, undefined);
    assert.strictEqual(record.mock.callCount(), 0);
    assert.strictEqual(warnings.length, 1);
});

test('startReplay - never starts the recorder for non sampled sessions', () => {
    const {start, record} = setup({sampled: false});
    assert.strictEqual(start(), undefined);
    assert.strictEqual(record.mock.callCount(), 0);
});

test('startReplay - passes privacy options to the recorder', () => {
    const {start, record} = setup();
    start({privacy: {...DEFAULT_PRIVACY, blockSelector: '.payment'}});
    assert.strictEqual(record.mock.callCount(), 1);
    const options = record.mock.calls[0].arguments[0];
    assert.strictEqual(typeof options.emit, 'function');
    assert.strictEqual(options.maskAllInputs, true);
    assert.strictEqual(
        options.blockSelector,
        '[data-elastic-replay="block"], .payment'
    );
});

test('startReplay - emits a start record and one record per event', async () => {
    const {start, emit, exported, stop, session} = setup();
    const replay = start();
    const events = [
        {type: 4, data: {href: 'http://localhost/'}, timestamp: 1793551230001},
        {type: 2, data: {node: {}}, timestamp: 1793551230002},
        {type: 3, data: {source: 2, x: 310}, timestamp: 1793551234567},
    ];
    events.forEach(emit);
    await replay?.shutdown();

    assert.strictEqual(stop.mock.callCount(), 1);
    const records = exported;
    assert.strictEqual(records.length, events.length + 1);

    const [startRecord, ...eventRecords] = records;
    const segmentId = startRecord.attributes['elastic.replay.segment.id'];
    assert.match(String(segmentId), UUID_V4);

    for (const r of records) {
        assert.strictEqual(r.instrumentationScope.name, REPLAY_SCOPE_NAME);
        assert.strictEqual(r.instrumentationScope.version, EDOT_VERSION);
        assert.strictEqual(r.severityNumber, undefined);
        assert.strictEqual(r.attributes['session.id'], session.id);
        assert.strictEqual(
            r.attributes['browser.tab.id'],
            'b2e4d7c1-5a6f-4e3b-8c9d-0a1b2c3d4e5f'
        );
        assert.strictEqual(
            r.attributes['elastic.replay.segment.id'],
            segmentId
        );
        assert.strictEqual(
            r.resource.attributes['service.name'],
            'replay-test'
        );
    }

    assert.strictEqual(startRecord.eventName, 'elastic.replay.start');
    assert.deepStrictEqual(startRecord.hrTime, [1793551230, 1_000_000]);
    assert.strictEqual(
        startRecord.attributes['elastic.replay.trigger'],
        'sampled'
    );
    assert.strictEqual(
        startRecord.attributes['elastic.replay.format'],
        'rrweb/2'
    );

    eventRecords.forEach((r, i) => {
        assert.strictEqual(r.eventName, 'elastic.replay.event');
        assert.strictEqual(r.body, JSON.stringify(events[i]));
        assert.strictEqual(r.attributes['elastic.replay.sequence'], i);
        assert.strictEqual(
            r.attributes['elastic.replay.event.type'],
            events[i].type
        );
        // No chunking yet, so no chunk or packed attributes
        assert.strictEqual(
            r.attributes['elastic.replay.chunk.index'],
            undefined
        );
        assert.strictEqual(r.attributes['elastic.replay.packed'], undefined);
    });
    assert.deepStrictEqual(eventRecords[2].hrTime, [1793551234, 567_000_000]);
});

test('startReplay - drops events once the session is no longer sampled', async () => {
    const {start, emit, exported, session} = setup();
    const replay = start();
    emit({type: 4, data: {}, timestamp: 1});
    session.sampled = false;
    emit({type: 3, data: {}, timestamp: 2});
    await replay?.shutdown();

    const events = exported.filter(
        (r) => r.eventName === 'elastic.replay.event'
    );
    assert.strictEqual(events.length, 1);
});

test('startReplay - gives up when the recorder does not start', (t) => {
    const warnings = captureWarnings(t);
    const {start, record} = setup();
    record.mock.mockImplementationOnce(() => undefined);
    assert.strictEqual(start(), undefined);
    record.mock.mockImplementationOnce(() => {
        throw new Error('no DOM');
    });
    assert.strictEqual(start(), undefined);
    assert.strictEqual(warnings.length, 1);
});

test('startReplay - contains recorder errors and starts at DOMContentLoaded', () => {
    const {start, record} = setup();
    start();
    const options = record.mock.calls[0].arguments[0];
    assert.strictEqual(options.recordAfter, 'DOMContentLoaded');
    assert.strictEqual(options.errorHandler(new Error('boom')), true);
});

test('startReplay - skips DomContentLoaded and Load so segments start with Meta', async () => {
    const {start, emit, exported} = setup();
    const replay = start();
    emit({type: 0, data: {}, timestamp: 1});
    emit({type: 1, data: {}, timestamp: 2});
    emit({type: 4, data: {}, timestamp: 3});
    await replay?.shutdown();

    const events = exported.filter(
        (r) => r.eventName === 'elastic.replay.event'
    );
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].attributes['elastic.replay.event.type'], 4);
    assert.strictEqual(events[0].attributes['elastic.replay.sequence'], 0);
});

test('startReplay - never throws from emit into the page', async () => {
    const {start, emit, exported} = setup();
    const replay = start();
    /** @type {any} */
    const circular = {type: 5, data: {}, timestamp: 1};
    circular.data.self = circular;
    assert.doesNotThrow(() => emit(circular));
    emit({type: 4, data: {}, timestamp: 2});
    await replay?.shutdown();

    const events = exported.filter(
        (r) => r.eventName === 'elastic.replay.event'
    );
    assert.deepStrictEqual(
        events.map((r) => r.attributes['elastic.replay.sequence']),
        [0]
    );
});

test('startReplay - masks text attributes when maskAllText is on', async () => {
    const snapshot = {
        type: 2,
        timestamp: 1,
        data: {
            node: {
                type: 2,
                tagName: 'input',
                attributes: {
                    placeholder: 'Jane Doe',
                    title: 'jane@example.com',
                    class: 'name',
                },
                childNodes: [],
            },
        },
    };
    const mutation = {
        type: 3,
        timestamp: 2,
        data: {
            source: 0,
            attributes: [{id: 7, attributes: {'aria-label': 'Jane', id: 'x'}}],
        },
    };
    /** @param {boolean} maskAllText */
    const bodies = async (maskAllText) => {
        const {start, emit, exported} = setup();
        const replay = start({privacy: {...DEFAULT_PRIVACY, maskAllText}});
        emit(snapshot);
        emit(mutation);
        await replay?.shutdown();
        return exported
            .filter((r) => r.eventName === 'elastic.replay.event')
            .map((r) => JSON.parse(String(r.body)));
    };

    const [masked, maskedMutation] = await bodies(true);
    assert.deepStrictEqual(masked.data.node.attributes, {
        placeholder: '**** ***',
        title: '****************',
        class: 'name',
    });
    assert.deepStrictEqual(maskedMutation.data.attributes[0].attributes, {
        'aria-label': '****',
        id: 'x',
    });
    // The event passed by the recorder is left untouched
    assert.strictEqual(snapshot.data.node.attributes.placeholder, 'Jane Doe');

    const [clear] = await bodies(false);
    assert.deepStrictEqual(
        clear.data.node.attributes,
        snapshot.data.node.attributes
    );
});
