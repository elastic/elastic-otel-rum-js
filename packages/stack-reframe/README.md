# Stack Reframe

Utilities to translate stack-trace frames from obfuscated or minified
applications back to the original source.

## How retracers work

Each retracer in this package does **purely transformational** work:
given an obfuscated stacktrace and a way to fetch source-map records,
it returns the deobfuscated stacktrace as a string. It does not know
anything about Elasticsearch, HTTP, authentication, indexing, the
filesystem, or where the records come from.

Callers supply that via two small generic contracts defined in
`src/retracer.ts`. The same contracts apply to every retracer in the
package; only the source-map record type changes.

## `SourceMapFetcher<T>`

```typescript
interface SourceMapFetcher<SourceMapType> {
  fetch(sources: string[]): Promise<SourceMapType[]>;
}
```

`sources` is the list of identifiers the retracer needs (deduplicated
by the retracer). The meaning of "identifier" is platform-specific
(see *Platforms* below). The fetcher returns the matching `T` records,
in any order. Missing records are simply omitted; the corresponding
frames pass through the retracer unchanged.

The fetcher is called **at most once per `retrace()`**. If it throws
or returns an empty array, the retracer returns the original
stacktrace.

This contract sits outside the retracer so callers (Kibana plugins,
CLIs, tests) can plug in any storage backend — Elasticsearch, local
files, an HTTP service — without the retracer needing to know.

## `Logger`

Optional injection point for diagnostic warnings emitted by the
retracer:

```typescript
interface Logger {
  warn(message: string): void;
}
```

Pass it as `options.logger` on the retracer's constructor. Defaults
to `console.warn`. Consumers (e.g. Kibana plugins) typically pass
their own logger so retracer warnings flow into their logging stack
alongside the rest of the application's diagnostics.

## Platforms

### Android

`RetracerAndroid` deobfuscates R8-minified stacktraces using
per-class JSON mapping documents. One document per **obfuscated
class**, with all the class's methods nested under `methods`. The
`_id` in Elasticsearch is `SHA-256(obfuscated_class)`.

```typescript
import {
  RetracerAndroid,
  type AndroidClassMap,
} from '@elastic/stack-reframe/retracer-android';
import type { SourceMapFetcher } from '@elastic/stack-reframe/retracer';

const retracer = new RetracerAndroid(stacktrace, fetcher);
const deobfuscated = await retracer.retrace();
```

Specifics for the `SourceMapFetcher<AndroidClassMap>` contract:

- Each entry in `sources` is an **obfuscated class name** (e.g.
  `["l8", "p", "co.elastic.otel.android.integration.MainActivity"]`).
- Documents whose `schema_version` doesn't match
  `SUPPORTED_SCHEMA_VERSION` are rejected (the storage shape is
  incompatible).
- Documents with a `map_version` newer than `MAX_KNOWN_MAP_VERSION`
  are still parsed and used on a best-effort basis, with one summary
  warning per retrace — see *Schema and R8 version evolution* below.

The `AndroidClassMap` type — including per-field TSDoc explaining
what each field means, when it can be absent, and how the retracer
interprets it — lives in
[`src/retracer-android.ts`](src/retracer-android.ts).

#### How Kibana plugs in

A Kibana plugin implements `SourceMapFetcher<AndroidClassMap>` by
talking to Elasticsearch and passes an instance to `RetracerAndroid`.

R8 mappings are stored in **per-build indices**,
`android-r8-mappings-<build_id>`. The `build_id` travels on the OTel
log event that carries the crash stacktrace, as the `app.build_id`
attribute. The runtime agent sets it from the same app coordinates
the Gradle plugin used at build time, so the plugin should read the
attribute rather than try to extract it from the stacktrace text. The
implementation should:

1. Read the `app.build_id` attribute from the OTel log event that
   contains the crash stacktrace. Different builds must hit different
   indices.
2. Compute `_id = SHA-256(class)` for every obfuscated class the
   retracer asks about.
3. Issue a single `_mget` against `android-r8-mappings-<build_id>`
   and return the `_source` of every `found: true` hit.

```typescript
import { createHash } from 'node:crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  RetracerAndroid,
  type AndroidClassMap,
} from '@elastic/stack-reframe/retracer-android';
import type { SourceMapFetcher } from '@elastic/stack-reframe/retracer';

class EsAndroidClassMapFetcher
  implements SourceMapFetcher<AndroidClassMap>
{
  constructor(
    private readonly es: ElasticsearchClient,
    private readonly buildId: string,
  ) {}

  async fetch(classes: string[]): Promise<AndroidClassMap[]> {
    if (classes.length === 0) return [];
    const response = await this.es.mget<AndroidClassMap>({
      index: `android-r8-mappings-${this.buildId}`,
      ids: classes.map(sha256),
    });
    return response.docs
      .filter((doc): doc is { found: true; _source: AndroidClassMap } =>
        doc.found === true && doc._source != null,
      )
      .map((doc) => doc._source);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function deobfuscate(
  es: ElasticsearchClient,
  buildId: string,
  stacktrace: string,
): Promise<string | undefined> {
  const fetcher = new EsAndroidClassMapFetcher(es, buildId);
  return new RetracerAndroid(stacktrace, fetcher).retrace();
}
```

#### Schema and R8 version evolution

Each document carries two independent versions, handled differently:

|          Constant          |       Compares against      |       Mismatch trigger       |                              Effect                              |
|----------------------------|-----------------------------|------------------------------|------------------------------------------------------------------|
| `SUPPORTED_SCHEMA_VERSION` | document's `schema_version` | document version ≠ supported | Document rejected; affected frames stay obfuscated               |
| `MAX_KNOWN_MAP_VERSION`    | document's `map_version`    | document version > max known | Document used best-effort; one summary warning logged per retrace |

**`schema_version`.** Goes up only when a consumer must change to
keep working: a field renamed, removed, semantics or encoding
changed. Plain additions (a new optional field, a new `extras` id,
new fields inside an existing `extras` object) don't need a bump —
the schema is set up to make additive changes safe (`enabled: false`
on the `methods` blob keeps Elasticsearch from indexing its inner
shape, and the `extras` array is stored as raw JSON the retracer
doesn't peek into ahead of time). A mismatch is a strict rejection:
the storage shape is incompatible and the retracer can't make sense
of the document.

**`map_version`.** R8 owns this number. R8 releases tweak the format
incrementally, so a mapping one version ahead of
`MAX_KNOWN_MAP_VERSION` is usually mostly-correct — rejecting it
would lose useful retraces for a small risk. The retracer parses and
uses the document, and logs one summary warning per retrace listing
the unknown versions:

```text
[stack-reframe] R8 map_version mismatch: 3 document(s) declare versions [3.0]
which exceed MAX_KNOWN_MAP_VERSION (2.2). Retracing best-effort; results may
be inaccurate. Update the retracer to extend MAX_KNOWN_MAP_VERSION.
```

This log is useful for debugging: if a user reports inaccurate
retraces and this warning shows up, the retracer most likely needs
upgrading to a release whose `MAX_KNOWN_MAP_VERSION` covers the
user's mapping.

#### Internal pipeline

For reference when modifying the retracer itself:

| Step | Function | Purpose |
| --- | --- | --- |
| 1 | `parseStackTraceLine` | Parse each line into a frame (`indent`, `className`, `methodName`, `lineNumber`) or a text line. |
| 2 | `collectExceptionClasses` + frame walk | Build the list of unique obfuscated classes for the fetcher. |
| 3 | `parseClassDocument` | Convert each `AndroidClassMap` (raw JSON) into a `ClassDocument` (lookup-friendly internal shape). Resolves `originalCall.sourceFile` per entry, with cross-class inline rules. |
| 4 | `findExceptionType` | Resolve the exception's L-descriptor (the JVM's internal class-name format, e.g. `Ljava/lang/RuntimeException;`) for `rewriteFrame` action matching. |
| 5 | Frame loop | For each frame: match obfuscated line → mapping entry, handle outlines / synthesized / rewriteFrame / default mappings, format. |
| 6 | `deobfuscateExceptionClassName` | On text lines (`X: message`, `Caused by: X`, `Suppressed: X`), substitute the class name. |

#### R8 algorithm essentials

The frame loop (row 5 of the table above) follows these rules:

- **Range match.** For an obfuscated frame at line `L`, an entry
  matches when `obf_range[0] <= L <= obf_range[1]`. The original
  line is `orig_range[0]` if `orig_range[0] === orig_range[1]`,
  otherwise `orig_range[0] + (L - obf_range[0])`. The result is kept
  inside `[orig_range[0], orig_range[1]]` so an ambiguous range
  (where `obf_range.span() != orig_range.span()`) can't produce a
  line that doesn't exist in the original source.
- **Inline chains.** Multiple entries with the same `obf_range`
  describe an inline chain. Output them all, innermost first.
- **Outlines.** An entry with extras `com.android.tools.r8.outline`
  marks the helper R8 created for outlining. Drop its frame and
  carry its obfuscated line forward to the next frame, where an
  `outlineCallsite.positions` map remaps it back to a real line in
  the caller before re-resolving. If the carry position isn't in
  `positions`, use the carry value itself.
- **Synthesized frames.** Only the **outermost** entry of the
  resolved chain is dropped if it is marked
  `com.android.tools.r8.synthesized` (or its `originalCall` contains
  `$$ExternalSynthetic`). Inner synthesized entries stay — stripping
  more would drop real inline frames in chains where two outer
  entries happen to be synthesized.
- **`rewriteFrame`.** On the topmost frame (the one nearest the
  exception), if the outermost entry has a
  `com.android.tools.r8.rewriteFrame` extras object whose
  `conditions` match the exception type, apply its `actions` —
  today only `removeInnerFrames(N)`. Condition matching is
  **strict**: only `throws(<L-descriptor>)` is recognised; anything
  else makes the match fail and the action is **not** applied.
  Skipping an unfamiliar condition is safer than guessing it
  matches.
- **Default mappings.** When the obfuscated frame has a line but no
  ranged entry covers it, the frame passes through unchanged —
  unless the method has *no* ranged entries at all, in which case
  the `default_mappings` are output (using `orig_range[0]` as the
  line number when present).
- **`Native Method` source-file preservation.** When the obfuscated
  frame's source-info is exactly `Native Method`, the retracer keeps
  it as-is even though the class and method names are still
  deobfuscated. Avoids inventing a `(Foo.kt:42)` for a native frame.

#### Resilience

- **Per-frame fallback.** Each frame runs inside a try/catch. If
  anything throws — a malformed extras object, an unexpected number
  type, a future R8 mapping shape we didn't expect — the original
  obfuscated frame is output unchanged and any in-progress
  outline-callsite tracking is reset. Other frames keep retracing
  normally.
- **Version-mismatched documents.** A `schema_version` mismatch
  rejects the document outright (incompatible storage shape);
  affected frames stay obfuscated. A `map_version` newer than
  `MAX_KNOWN_MAP_VERSION` is **not** rejected — see *Schema and R8
  version evolution* above.

#### Testing

`test/retracer-android.spec.ts` is a fixture-driven integration
test:

- `test/fixtures/android-retrace-data/stacktraces/*.txt` —
  obfuscated inputs.
- `test/fixtures/android-retrace-data/es-documents/*.txt` — the
  per-class JSON documents the fetcher would return (one per
  obfuscated class).
- `test/fixtures/android-retrace-data/expected-output/*.txt` — the
  expected deobfuscated output.

The test uses an in-memory `SourceMapFetcher` that filters the
fixture documents by `obfuscated_class`. To add a new scenario,
mirror the file name across the three directories and add an entry
to the scenario list in `test/fixtures/androidmaps.ts`.

Fixtures come from the producer (the Gradle plugin that creates
these documents) and are mirrored into this package; keep them in
sync when the producer's schema or example mappings change.

##### Updating `MAX_KNOWN_MAP_VERSION`

When R8 ships a new `mapVersion`:

1. Read R8's release notes and changelog for entries between the
   previously-validated version and the new one. Focus on changes
   to the mapping format and to the retrace algorithm.
2. If anything new is introduced (a new extra id, a new line-rule
   semantic, etc.), add a fixture exercising it under
   `test/fixtures/android-retrace-data/` and the matching retracer
   support.
3. Update `MAX_KNOWN_MAP_VERSION` in `retracer-android.ts` and add
   a `retracer-android.spec.ts` case for a document at the new
   version.

### Web

`RetracerWeb` consumes [Source Map](https://sourcemaps.info/spec.html)
records (`RawSourceMap` from the `source-map` package) keyed by source
file URL. Suitable for deobfuscating browser stacktraces produced from
minified JavaScript bundles.
