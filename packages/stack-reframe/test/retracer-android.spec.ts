/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {test} from 'node:test';

import type {AndroidClassMap} from '../src/retracer-android.js';
import {RetracerAndroid} from '../src/retracer-android.js';
import type {Logger} from '../src/retracer.js';

import {androidMapFixtures} from './fixtures/androidmaps.js';

test(`Android - when has the class maps`, async () => {
    for (const fixture of androidMapFixtures) {
        const {expected, classMaps, stacktrace} = fixture;
        const maps = classMaps.map((s: any) =>
            JSON.parse(s.content)
        ) as AndroidClassMap[];
        const retracer = new RetracerAndroid(stacktrace, {
            fetch: (sources) =>
                Promise.resolve(
                    maps.filter((map) => sources.includes(map.obfuscated_class))
                ),
        });
        const result = await retracer.retrace();

        assert.strictEqual(
            result,
            expected,
            `${fixture.name} retraces correctly`
        );
    }
});

async function retraceWith(
    stacktrace: string,
    maps: AndroidClassMap[],
    logger?: Logger
): Promise<string | undefined> {
    const retracer = new RetracerAndroid(
        stacktrace,
        {
            fetch: (sources) =>
                Promise.resolve(
                    maps.filter((map) => sources.includes(map.obfuscated_class))
                ),
        },
        {logger}
    );
    return retracer.retrace();
}

/** Captures `logger.warn` calls so tests can assert on the messages. */
function recordingLogger(): {logger: Logger; warnings: string[]} {
    const warnings: string[] = [];
    return {logger: {warn: (msg) => warnings.push(msg)}, warnings};
}

test('Android - outline callsite falls back to identity when carry position is missing from positions', async () => {
    // Outliner: synthetic class hosting the outlined method `a`. Its line 1 is
    // the outline body; the `positions` map has only "1" → 4. We deliberately
    // make the caller's outline frame land on a line *not* in the map so the
    // retracer must use the carry position itself, mirroring R8's
    // `positions.getOrDefault(L, L)`.
    const outliner: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 's2',
        original_class: 'com.example.Outliner',
        source_file: 'Outliner.kt',
        methods: {
            a: {
                mappings: [
                    {
                        obf_range: [1, 1],
                        orig_range: [0, 0],
                        method: 'outlinedBody',
                        extras: [{id: 'com.android.tools.r8.outline'}],
                    },
                ],
            },
        },
    };
    // Caller: `a` has an entry covering obf line 27 with an outlineCallsite
    // whose positions only know about "1". Frame at line 27 is the outline
    // call; the carry value (1) is NOT in `positions`, so the retracer must
    // fall through to use 1 directly as the next frame's line.
    const caller: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 's3',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
            a: {
                mappings: [
                    {
                        obf_range: [27, 27],
                        orig_range: [50, 50],
                        method: 'caller',
                        extras: [
                            {
                                id: 'com.android.tools.r8.outlineCallsite',
                                // Map only knows "2" — the carry "1" must fall
                                // back to identity per R8 semantics.
                                positions: {'2': 99},
                                outline: 'Ls2;a()V',
                            },
                        ],
                    },
                    // The identity-fallback line (1) must resolve here.
                    {
                        obf_range: [1, 1],
                        orig_range: [42, 42],
                        method: 'caller',
                    },
                ],
            },
        },
    };

    const stacktrace = [
        'java.lang.RuntimeException: outline-miss',
        '\tat s2.a(SourceFile:1)',
        '\tat s3.a(SourceFile:27)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [outliner, caller]);

    assert.strictEqual(
        result,
        [
            'java.lang.RuntimeException: outline-miss',
            // Outline frame is suppressed (synthetic outline body).
            // Caller frame is rewritten using the identity-fallback line 1
            // → entry [1,1] → original line 42.
            '\tat com.example.Caller.caller(Caller.kt:42)',
        ].join('\n')
    );
});

test('Android - only the outermost synthesized frame is stripped from an inline chain', async () => {
    // Inline chain at obf line 5 with three entries (innermost-first):
    //   real() → synth1 (synthesized) → synth2 (synthesized).
    // R8 strips only `synth2` (the outermost). Our retracer must keep
    // `synth1` instead of looping pop.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [5, 5], orig_range: [10, 10], method: 'real'},
                    {
                        obf_range: [5, 5],
                        orig_range: [20, 20],
                        method: 'synth1',
                        extras: [{id: 'com.android.tools.r8.synthesized'}],
                    },
                    {
                        obf_range: [5, 5],
                        orig_range: [30, 30],
                        method: 'synth2',
                        extras: [{id: 'com.android.tools.r8.synthesized'}],
                    },
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.RuntimeException: synth-chain',
        '\tat a.m(SourceFile:5)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.RuntimeException: synth-chain',
            // synth2 (outermost) stripped; synth1 kept.
            '\tat com.example.Foo.real(Foo.kt:10)',
            '\tat com.example.Foo.synth1(Foo.kt:20)',
        ].join('\n'),
        'second-outermost synthesized frame must be retained'
    );
});

test('Android - documents with a newer map_version are retraced best-effort with a warning', async () => {
    // `map_version: "9.9"` is way above MAX_KNOWN_MAP_VERSION. The
    // retracer attempts the retrace anyway (each R8 release usually
    // tweaks the format incrementally, so most frames come out right)
    // and emits a single warning so operators can correlate user
    // complaints about inaccurate traces with this mismatch and know
    // to upgrade.
    const map: AndroidClassMap = {
        schema_version: 1,
        map_version: '9.9',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'foo'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const {logger, warnings} = recordingLogger();
    const result = await retraceWith(stacktrace, [map], logger);

    assert.strictEqual(
        result,
        '\tat com.example.Foo.foo(Foo.kt:42)',
        'frame must be retraced even when map_version > MAX (best-effort)'
    );
    assert.strictEqual(
        warnings.length,
        1,
        'exactly one mismatch warning expected'
    );
    assert.match(warnings[0], /\[stack-reframe\] R8 map_version mismatch/);
    assert.match(warnings[0], /9\.9/);
    assert.match(warnings[0], /MAX_KNOWN_MAP_VERSION \(2\.2\)/);
});

test('Android - the map_version warning is emitted once per retrace, listing every distinct unknown version', async () => {
    // Two documents, two different unknown versions — the warning must
    // mention both versions and the total document count, but be a
    // single message (one log line per retrace, so callers can grep
    // and count cleanly).
    const docA: AndroidClassMap = {
        schema_version: 1,
        map_version: '9.9',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'foo'},
                ],
            },
        },
    };
    const docB: AndroidClassMap = {
        schema_version: 1,
        map_version: '10.0',
        obfuscated_class: 'b',
        original_class: 'com.example.Bar',
        source_file: 'Bar.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [99, 99], method: 'bar'},
                ],
            },
        },
    };
    const stacktrace = [
        '\tat a.m(SourceFile:1)',
        '\tat b.m(SourceFile:1)',
    ].join('\n');

    const {logger, warnings} = recordingLogger();
    await retraceWith(stacktrace, [docA, docB], logger);

    assert.strictEqual(
        warnings.length,
        1,
        'exactly one summary warning expected'
    );
    assert.match(warnings[0], /2 document\(s\)/);
    assert.match(warnings[0], /9\.9, 10\.0/);
});

test('Android - documents whose map_version equals the retracer max are accepted with no warning', async () => {
    const map: AndroidClassMap = {
        schema_version: 1,
        map_version: '2.2',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'foo'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const {logger, warnings} = recordingLogger();
    const result = await retraceWith(stacktrace, [map], logger);

    assert.strictEqual(result, '\tat com.example.Foo.foo(Foo.kt:42)');
    assert.deepStrictEqual(
        warnings,
        [],
        'no warning expected when version equals MAX'
    );
});

test('Android - documents without map_version are accepted with no warning (legacy R8)', async () => {
    // R8 < 8 (map-version 1.x) emits no file-level version comment. The
    // producer surfaces that as `map_version: undefined`, and we accept
    // those documents silently — R8's default is 1.0, which is below
    // MAX, so there is nothing to warn about.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'foo'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const {logger, warnings} = recordingLogger();
    const result = await retraceWith(stacktrace, [map], logger);

    assert.strictEqual(result, '\tat com.example.Foo.foo(Foo.kt:42)');
    assert.deepStrictEqual(
        warnings,
        [],
        'no warning expected for legacy/null map_version'
    );
});

test('Android - documents with a malformed map_version are retraced best-effort with a warning', async () => {
    // Non-numeric version strings (custom builds, hand-edited data, a
    // future format we cannot parse) sort as "newer than known" via
    // `compareMapVersion` — so they go through the same best-effort +
    // warning path as a too-new numeric version.
    const map: AndroidClassMap = {
        schema_version: 1,
        map_version: 'experimental-build',
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'foo'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const {logger, warnings} = recordingLogger();
    const result = await retraceWith(stacktrace, [map], logger);

    assert.strictEqual(result, '\tat com.example.Foo.foo(Foo.kt:42)');
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /experimental-build/);
});

test('Android - rewriteFrame is fail-closed for unknown condition kinds', async () => {
    // The matched entry has a rewriteFrame extras with TWO conditions:
    //   throws(Ljava/lang/NullPointerException;)         <-- known, matches
    //   instanceOf(Lcom/example/Marker;)                  <-- unknown
    // R8 today only knows `throws(...)`; if it ever ships another condition
    // we must NOT silently apply the action. The retracer treats the
    // unknown condition as a no-match → action is skipped → no frames
    // removed.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [10, 10], method: 'inner'},
                    {
                        obf_range: [1, 1],
                        orig_range: [20, 20],
                        method: 'outer',
                        extras: [
                            {
                                id: 'com.android.tools.r8.rewriteFrame',
                                conditions: [
                                    'throws(Ljava/lang/NullPointerException;)',
                                    'instanceOf(Lcom/example/Marker;)',
                                ],
                                actions: ['removeInnerFrames(1)'],
                            },
                        ],
                    },
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.NullPointerException: x',
        '\tat a.m(SourceFile:1)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.NullPointerException: x',
            // Both inline frames retained — the unknown `instanceOf(...)`
            // condition fails the `every` check, so `removeInnerFrames(1)`
            // is NOT applied.
            '\tat com.example.Foo.inner(Foo.kt:10)',
            '\tat com.example.Foo.outer(Foo.kt:20)',
        ].join('\n')
    );
});

test('Android - rewriteFrame still applies when only known conditions match', async () => {
    // Same shape as the previous test, but with a single known condition
    // that DOES match the throwable. Sanity check that the fail-closed
    // change did not break the happy path.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [10, 10], method: 'inner'},
                    {
                        obf_range: [1, 1],
                        orig_range: [20, 20],
                        method: 'outer',
                        extras: [
                            {
                                id: 'com.android.tools.r8.rewriteFrame',
                                conditions: [
                                    'throws(Ljava/lang/NullPointerException;)',
                                ],
                                actions: ['removeInnerFrames(1)'],
                            },
                        ],
                    },
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.NullPointerException: x',
        '\tat a.m(SourceFile:1)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.NullPointerException: x',
            // Inner frame removed by `removeInnerFrames(1)`.
            '\tat com.example.Foo.outer(Foo.kt:20)',
        ].join('\n')
    );
});

test('Android - a corrupt extras object falls back to the original frame, the rest of the trace keeps retracing', async () => {
    // Frame 1's mapping carries an extras with an object pretending to be
    // an `outlineCallsite` whose `positions` is poisoned in a way that
    // makes a downstream lookup throw. Frame 2 is healthy. We want frame 1
    // to fall back to its original obfuscated form, frame 2 to retrace.
    //
    // Today no specific path throws on a malformed extras (we mostly use
    // optional chaining), so we engineer the failure with an extras `id`
    // we recognise but whose `positions` triggers a coding-defect path —
    // the `String(...)` lookup uses the carry; if a frame loop later did
    // `extra.positions[null]` we'd surface the bug. The intent of this
    // test is to lock down the per-frame fallback semantics: whatever
    // throws, we still emit the rest.
    //
    // We trigger the throw by overriding `String.prototype.toString` for
    // a poisoned key wrapped in a Proxy on `extras` access.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {
                        obf_range: [1, 1],
                        orig_range: [10, 10],
                        method: 'first',
                        // A poisoned extras object: any property access on
                        // `extras[0]` throws.
                        extras: new Proxy([{}] as any, {
                            get() {
                                throw new Error('boom');
                            },
                        }) as any,
                    },
                ],
            },
            n: {
                mappings: [
                    {obf_range: [2, 2], orig_range: [20, 20], method: 'second'},
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.RuntimeException: x',
        '\tat a.m(SourceFile:1)',
        '\tat a.n(SourceFile:2)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.RuntimeException: x',
            // Frame 1: poisoned extras → original line preserved.
            '\tat a.m(SourceFile:1)',
            // Frame 2: healthy, retraces normally.
            '\tat com.example.Foo.second(Foo.kt:20)',
        ].join('\n')
    );
});

test('Android - interpolated line is clamped to orig_range when spans differ', async () => {
    // obf_range = [1, 10] (10 lines), orig_range = [100, 105] (6 lines).
    // For obf line 8 the naive formula yields 100 + (8 - 1) = 107, which
    // is outside `[100, 105]`. Clamp to 105 so we never surface a line
    // number that doesn't exist in the original source.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 10], orig_range: [100, 105], method: 'foo'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:8)';
    const result = await retraceWith(stacktrace, [map]);
    assert.strictEqual(result, '\tat com.example.Foo.foo(Foo.kt:105)');
});

test('Android - Native Method source-file is preserved when class is in the mapping', async () => {
    // Mapped class with a native method: R8 keeps `(Native Method)`
    // verbatim even though class+method are deobfuscated.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'l8',
        original_class: 'com.example.NativeHolder',
        source_file: 'NativeHolder.kt',
        methods: {
            a: {
                mappings: [
                    {
                        obf_range: [1, 1],
                        orig_range: [10, 10],
                        method: 'nativePollOnce',
                    },
                ],
            },
        },
    };
    const stacktrace = ['\tat l8.a(Native Method)'].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        '\tat com.example.NativeHolder.nativePollOnce(Native Method)'
    );
});

// -----------------------------------------------------------------
// Feature 2 — Source-file extras and document-level promotion
// -----------------------------------------------------------------

test('Android - source-file is inferred as .kt when document has none and class ends with `Kt`', async () => {
    // Some classes (framework / generated / pure-bytecode) carry no
    // `sourceFile` extra in `mapping.txt`, so the document arrives without
    // a `source_file`. The retracer falls back to inference: the simple
    // name of `com.example.FooKt` strips the `Kt` suffix → `Foo.kt`.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.FooKt',
        // No `source_file` field at all.
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'greet'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const result = await retraceWith(stacktrace, [map]);
    assert.strictEqual(result, '\tat com.example.FooKt.greet(Foo.kt:42)');
});

test('Android - source-file is inferred as .java when document has none and class is non-Kt', async () => {
    // Same as above but the original class name has no `Kt` suffix and no
    // `$` (i.e. not a nested/anonymous Kotlin class), so inference
    // assumes a Java source file: `Foo.java`.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        methods: {
            m: {
                mappings: [
                    {obf_range: [1, 1], orig_range: [42, 42], method: 'greet'},
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const result = await retraceWith(stacktrace, [map]);
    assert.strictEqual(result, '\tat com.example.Foo.greet(Foo.java:42)');
});

test('Android - cross-class entry without source_file override infers from the inlinee class', async () => {
    // Cross-class inline where the inlinee class is NOT in the mapping
    // (e.g. `kotlin.collections.ArraysKt` from the Kotlin stdlib). The
    // producer cannot pre-resolve a source file for an unmapped class,
    // so the entry has a `class` override but no `source_file` override.
    //
    // The retracer must NOT fall back to the document's `source_file`
    // — that file describes the *outer* class, not the inlinee. Instead
    // it infers from the inlinee's class name (`ArraysKt` → `Arrays.kt`).
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
            m: {
                mappings: [
                    {
                        obf_range: [1, 1],
                        orig_range: [42, 42],
                        method: 'first',
                        class: 'kotlin.collections.ArraysKt',
                        // No `source_file` override.
                    },
                ],
            },
        },
    };
    const stacktrace = '\tat a.m(SourceFile:1)';

    const result = await retraceWith(stacktrace, [map]);
    assert.strictEqual(
        result,
        '\tat kotlin.collections.ArraysKt.first(Arrays.kt:42)'
    );
});

// -----------------------------------------------------------------
// Feature 8 — Inline frame expansion
// -----------------------------------------------------------------

test('Android - two entries at the same obfuscated line expand to two output frames (innermost-first)', async () => {
    // R8 emits multiple mapping entries with the SAME `obf_range` when
    // one method was inlined into another; each entry is one frame of
    // the inline chain. Array order is innermost-to-outermost (R8's
    // convention) — the retracer must preserve that order in the
    // output so the deobfuscated trace reads in conventional Java
    // order. Features 5 (synthesized stripping) and 7 (rewriteFrame)
    // also rely on this contract since they inspect the *last* entry
    // of the array as the outermost frame.
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Foo',
        source_file: 'Foo.kt',
        methods: {
            m: {
                mappings: [
                    // Innermost: the inlined helper.
                    {obf_range: [5, 5], orig_range: [12, 12], method: 'helper'},
                    // Outermost: the source-level caller.
                    {obf_range: [5, 5], orig_range: [20, 20], method: 'caller'},
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.RuntimeException: x',
        '\tat a.m(SourceFile:5)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.RuntimeException: x',
            // Two output frames from one obfuscated frame; innermost
            // (helper) first, outermost (caller) last.
            '\tat com.example.Foo.helper(Foo.kt:12)',
            '\tat com.example.Foo.caller(Foo.kt:20)',
        ].join('\n')
    );
});

test('Android - inline frame expansion composes with cross-class inlining', async () => {
    // The typical real-world chain: bytecode lives in `Caller.caller`,
    // but the inlined helper originated in a different class
    // (`com.example.Inlinee`). Two entries on the same `obf_range`,
    // one with class+source_file overrides, one without.
    //
    // This test locks down both contracts at once:
    //   - expansion (1 obf line → 2 deobfuscated frames),
    //   - cross-class encoding (innermost frame's class/source_file
    //     come from the entry overrides; outermost from the document).
    const map: AndroidClassMap = {
        schema_version: 1,
        obfuscated_class: 'a',
        original_class: 'com.example.Caller',
        source_file: 'Caller.kt',
        methods: {
            m: {
                mappings: [
                    // Innermost: inlined from another class — entry
                    // overrides apply.
                    {
                        obf_range: [5, 5],
                        orig_range: [12, 12],
                        method: 'helper',
                        class: 'com.example.Inlinee',
                        source_file: 'Inlinee.kt',
                    },
                    // Outermost: the caller in the document's own class.
                    {obf_range: [5, 5], orig_range: [20, 20], method: 'caller'},
                ],
            },
        },
    };
    const stacktrace = [
        'java.lang.RuntimeException: x',
        '\tat a.m(SourceFile:5)',
    ].join('\n');

    const result = await retraceWith(stacktrace, [map]);

    assert.strictEqual(
        result,
        [
            'java.lang.RuntimeException: x',
            '\tat com.example.Inlinee.helper(Inlinee.kt:12)',
            '\tat com.example.Caller.caller(Caller.kt:20)',
        ].join('\n')
    );
});
