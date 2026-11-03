# Session replay: wire format and config

Status: draft, for review by the Kibana player (elastic/observability-dev#6295)
and ingest (elastic/observability-dev#6293) owners.
Tracking issue: [#140](https://github.com/elastic/elastic-otel-rum-js/issues/140).

This document defines what EDOT Browser sends for session replay and how
`replay` is configured. Capture (elastic/observability-dev#6141) and the export
pipeline (elastic/observability-dev#6140) implement it; the player and ingest
routing read it.

There is no OTel semantic convention for session replay. Everything below is an
Elastic extension, so all new names live under `co.elastic.replay.*`. EDOT
prefixes names that semantic conventions do not define with Elastic's reverse
domain, `co.elastic.`, as the
[OTel naming guide](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/general/naming.md)
recommends. We rename once the Browser SIG defines replay, and this document is
the mapping we migrate from.

## Summary

- Each rrweb event becomes one OTLP log record (or several when it is large)
  with `eventName` `co.elastic.replay.event`, emitted by the instrumentation scope
  `@elastic/opentelemetry-browser/replay`. The body is the rrweb event JSON.
- Events are ordered within a **segment**: one recorder run in one tab for one
  session, normally one page load. Every segment starts at sequence `0` with a
  rrweb Meta and FullSnapshot, so it plays on its own.
- When a segment starts recording, the SDK emits one `co.elastic.replay.start` log
  record on the regular EDOT logs pipeline. Backends use it to know a session has
  a replay. There is no `rum.has_replay` attribute.
- `replay.sampleRate` and `replay.errorSampleRate` are 0..1 rates applied to
  sessions that `session.sampleRate` already kept, decided once per session.

## Replay records

### Identity

| Field | Value |
| --- | --- |
| Instrumentation scope name | `@elastic/opentelemetry-browser/replay` |
| Instrumentation scope version | EDOT Browser version |
| `eventName` | `co.elastic.replay.event` |
| `timestamp` | rrweb `event.timestamp` (ms, converted to ns) |
| `observedTimestamp` | time the SDK emitted the record |
| `severityNumber` | unset |
| `body` | string: the rrweb event JSON, or one chunk of it (see [Chunking](#chunking)) |

The scope name follows the package-name convention of the other EDOT and
upstream scopes, so it does not depend on which recorder we use. The POC scope
`elastic-rrweb` named the library rather than the producer.

### Attributes

Set on every replay record:

| Attribute | Type | Description |
| --- | --- | --- |
| `session.id` | string | Added by the session log processor, like on every other EDOT signal. |
| `browser.tab.id` | string | Added by the session log processor. |
| `co.elastic.replay.segment.id` | string | UUID v4, new for each segment. |
| `co.elastic.replay.sequence` | int | Position of the rrweb event in its segment. Starts at `0`, increases by 1 per event. All chunks of an event share it. |
| `co.elastic.replay.event.type` | int | rrweb `EventType`: 0 DomContentLoaded, 1 Load, 2 FullSnapshot, 3 IncrementalSnapshot, 4 Meta, 5 Custom, 6 Plugin. |

Set only when the value differs from the default. A missing attribute means
the default:

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `co.elastic.replay.chunk.index` | int | `0` | 0-based index of this chunk. |
| `co.elastic.replay.chunk.count` | int | `1` | Number of chunks for this event. |
| `co.elastic.replay.packed` | boolean | `false` | `true` when the body is `@rrweb/packer` output instead of plain JSON. |

Most records are small incremental events that are neither split nor packed, so
leaving these out keeps them about 20% smaller in OTLP/JSON. The browser
exporter does not compress requests, so per-record bytes go over the network as
they are. A split event sets both chunk attributes on every chunk, including
`chunk.index: 0` on the first.

`session.previous_id` and `session.sampling_rate` also appear because the
session processor adds them. Records carry no URL attributes: the rrweb Meta
event has the page URL, and the player takes navigations from the OTel data.

The chunk attributes (`co.elastic.replay.chunk.*`, `co.elastic.replay.packed`) are
shared with elastic/observability-dev#6140.

### Segments and ordering

A segment is the event stream of one recorder run in one tab for one session.
The SDK starts a new segment, with a new `co.elastic.replay.segment.id`, a
sequence reset to `0`, and a Meta and FullSnapshot as its first events, when:

- a page loads and recording starts (a full navigation or reload starts a new
  JS context and a new segment),
- the session rotates while the page is open (idle timeout or max duration),
- recording starts again after `stopReplay()`.

Periodic checkouts, the snapshot taken when a hidden tab becomes visible, and
`resumeReplay()` add FullSnapshots inside the current segment. They do not start
a new one.

Why not one sequence per session, as in the POC: a session is shared by all tabs
of an origin (`localStorage`), so tabs write interleaved, colliding counters, and
the counter has to survive page loads through storage. A per-segment counter
lives in memory, never collides, and a gap in it means a record was lost.

How a player reads a session:

1. List the session's segments: the `co.elastic.replay.start` records for the
   `session.id` (see below), or a terms aggregation on
   `co.elastic.replay.segment.id` in the replay data.
2. Fetch each segment's records sorted by `co.elastic.replay.sequence`, then
   `co.elastic.replay.chunk.index` with missing values first (`missing: "_first"`).
   Page with `search_after` on those two fields.
3. Reassemble chunks, unpack packed events, and play.
4. Segments of the same `browser.tab.id` are sequential page loads. Order them by
   start time and play them back to back as one stream; each starts with a
   FullSnapshot, so rrweb rebuilds the page at the boundary.
5. Segments of different tabs overlap in time. Never merge them into one rrweb
   stream. Show them as separate tracks or let the user pick a tab.

If a FullSnapshot is incomplete (a chunk or record is missing), the segment is
not playable until its next FullSnapshot. A player skips ahead to it rather than
replaying incremental events on top of a missing DOM.

### Chunking

rrweb FullSnapshots can exceed 1 MB, more than many OTLP endpoints accept per
request. The SDK serializes the event (and packs it when packing is on), then
splits the string into UTF-8-safe pieces of at most `replay.maxChunkBytes` bytes
(default 256 KiB). Each piece is its own log record with the same attributes,
except `co.elastic.replay.chunk.index`. Events that fit in one record carry no
chunk attributes.

To reassemble: group by `co.elastic.replay.segment.id` and
`co.elastic.replay.sequence`, read `chunk.count` (default `1`), check that all
pieces are present, concatenate the bodies in `chunk.index` order (default `0`),
then `JSON.parse` the result (or `unpack` it when `co.elastic.replay.packed` is
`true`). Drop events with missing chunks.

Producers never emit more than 256 chunks for one event and drop larger events
with a diagnostic. Consumers may reject `chunk.count` above 256.

### Replay start record

When a segment starts recording live, the SDK emits one record through the
regular EDOT logger (scope `@elastic/opentelemetry-browser`, the same as
`session.start`), so it lands with the session's other logs and not in the
replay data stream.

| Field | Value |
| --- | --- |
| `eventName` | `co.elastic.replay.start` |
| `timestamp` | timestamp of the segment's first rrweb event |
| `session.id`, `browser.tab.id` | added by the session log processor |
| `co.elastic.replay.segment.id` | the segment it starts |
| `co.elastic.replay.trigger` | `sampled` (recorded from the start) or `error` (started by `errorSampleRate`) |
| `co.elastic.replay.format` | `rrweb/2`: body format and its major version |

A session has a replay when at least one `co.elastic.replay.start` record exists
for its `session.id`. The sessions transform can set `has_replay` from that and
the player can list segments from the same records.

We chose this over a `rum.has_replay` attribute on all signals because:

- the attribute adds bytes to every span and log of the session;
- signals emitted before recording starts (before the recorder loads, or before
  the error that triggers an error-sampled replay) would not carry it, so a
  backend still has to aggregate "any record has it";
- it needs every signal processor to know the recorder state;
- the start record also gives the trigger, the format and the segment list.

The Kibana POC derives `hasReplay` with an aggregation over the replay index.
That keeps working, but a lookup on the start records is far cheaper.

### Examples

A small event in OTLP/JSON (resource and scope omitted):

```json
{
    "timeUnixNano": "1793551234567000000",
    "observedTimeUnixNano": "1793551234570000000",
    "eventName": "co.elastic.replay.event",
    "body": {"stringValue": "{\"type\":3,\"data\":{\"source\":2,\"type\":2,\"id\":42,\"x\":310,\"y\":88},\"timestamp\":1793551234567}"},
    "attributes": [
        {"key": "session.id", "value": {"stringValue": "6f1c2e7a-0d3b-4c55-9a8e-2b7f9e0c1d34"}},
        {"key": "browser.tab.id", "value": {"stringValue": "b2e4d7c1-5a6f-4e3b-8c9d-0a1b2c3d4e5f"}},
        {"key": "co.elastic.replay.segment.id", "value": {"stringValue": "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d"}},
        {"key": "co.elastic.replay.sequence", "value": {"intValue": "57"}},
        {"key": "co.elastic.replay.event.type", "value": {"intValue": "3"}}
    ]
}
```

It is neither split nor packed, so it has no chunk or `packed` attributes.

A FullSnapshot of 600 KiB with the default chunk size becomes three records
with `co.elastic.replay.sequence` `1`, `co.elastic.replay.event.type` `2`,
`co.elastic.replay.chunk.count` `3` and `co.elastic.replay.chunk.index` `0`, `1`, `2`.

The start record for the same segment:

```json
{
    "timeUnixNano": "1793551230001000000",
    "eventName": "co.elastic.replay.start",
    "attributes": [
        {"key": "session.id", "value": {"stringValue": "6f1c2e7a-0d3b-4c55-9a8e-2b7f9e0c1d34"}},
        {"key": "browser.tab.id", "value": {"stringValue": "b2e4d7c1-5a6f-4e3b-8c9d-0a1b2c3d4e5f"}},
        {"key": "co.elastic.replay.segment.id", "value": {"stringValue": "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d"}},
        {"key": "co.elastic.replay.trigger", "value": {"stringValue": "sampled"}},
        {"key": "co.elastic.replay.format", "value": {"stringValue": "rrweb/2"}}
    ]
}
```

## Ingest notes

For elastic/observability-dev#6293:

- Route on the scope name `@elastic/opentelemetry-browser/replay` and set
  `data_stream.dataset` to `rum.replay`. The `co.elastic.replay.start` records use
  the main EDOT scope and stay with the other logs.
- The Elasticsearch exporter in `otel` mode appends `.otel` to the dataset, so the
  index is `logs-rum.replay.otel-<namespace>`. The POC index pattern
  `logs-rum.replay-*` does not match it; the player should query
  `logs-rum.replay*` or the routing should use a dataset that matches.
- Mappings: `body` stored but not indexed for full text; `session.id`,
  `browser.tab.id` and `co.elastic.replay.segment.id` as `keyword`;
  `co.elastic.replay.sequence`, `chunk.index`, `chunk.count` and `event.type` as
  `long`; `co.elastic.replay.packed` as `boolean`. Map the optional fields
  explicitly so queries and sorts work before the first split or packed event
  arrives.

## Configuration

```js
startBrowserSdk({
    session: {sampleRate: 0.5},
    replay: {
        enabled: true,
        sampleRate: 0.1,
        errorSampleRate: 1,
        privacy: {
            maskAllInputs: true,
            maskAllText: false,
            maskTextSelector: '.customer-name',
            blockSelector: '.payment-form',
        },
        quality: {
            recordCanvas: false,
            sampling: {mousemove: 50, scroll: 150},
        },
    },
});
```

Replay is off unless `replay.enabled` is `true`. The recorder is loaded with a
dynamic `import()`, so apps that leave replay off do not download it.

### Top level

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | Turns replay on. |
| `sampleRate` | number, 0..1 | `0` | Share of sampled sessions recorded from the start. |
| `errorSampleRate` | number, 0..1 | `0` | Share of the remaining sampled sessions recorded from their first error. |
| `privacy` | object | see below | Masking and blocking. |
| `quality` | object | see below | Recorder fidelity and cost. |
| `maxChunkBytes` | number | `262144` | Largest body per record, in bytes. Owned by elastic/observability-dev#6140. |
| `flushIntervalMs` | number | `1000` | Replay batch export interval. Owned by elastic/observability-dev#6140. |

Rates follow `session.sampleRate`: 0..1, invalid values fall back to the default
with a warning, out-of-range values are clamped, four decimal places.

### Sampling

Replay only runs for sessions that `session.sampleRate` kept, so the share of
all sessions recorded from the start is `session.sampleRate * replay.sampleRate`.

The decision is made once per session and is the same in every tab and on every
page load. The POC drew `Math.random()` on each page load, so a session could
record its first page and not its second. Instead, the SDK derives a value `u` in
`[0, 1)` from the last 8 hex digits of `session.id`. These are independent of the
first 8 digits that `SessionSampler` uses, so the two decisions do not correlate.

- `u < sampleRate`: record from the start (`trigger: sampled`).
- otherwise, `(u - sampleRate) / (1 - sampleRate) < errorSampleRate`: buffer in
  memory and record from the first error (`trigger: error`).
- otherwise: do not record.

Error mode keeps a bounded buffer that always begins with a FullSnapshot (the
recorder checks out often while buffering). On the first uncaught error or
unhandled rejection, the buffer becomes the start of a segment and recording
continues live. The session is marked live in session storage so later page
loads, in any tab, record from the start. The buffer size and checkout interval
belong to elastic/observability-dev#6141.

### `privacy`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maskAllInputs` | boolean | `true` | Replace the value of every input with `*`. |
| `maskAllText` | boolean | `false` | Replace all text content with `*`. |
| `maskInputOptions` | object | | Per input type masking, as in rrweb, when `maskAllInputs` is `false`. |
| `maskTextSelector` | string | | CSS selector whose text is masked. |
| `blockSelector` | string | | CSS selector whose elements are replaced by an empty box of the same size. |
| `ignoreSelector` | string | | CSS selector whose input events are not recorded. |
| `maskInputFn` | function | | Custom input masking. |
| `maskTextFn` | function | | Custom text masking. |

The selectors `[data-elastic-replay="mask"]`, `[data-elastic-replay="block"]`
and `[data-elastic-replay="ignore"]` always apply, so markup can opt out without
config. Configured selectors add to them.

### `quality`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slimDOM` | boolean | `true` | Drop scripts, comments and head noise from snapshots. |
| `inlineStylesheet` | boolean | `true` | Inline stylesheets so playback does not depend on the site's CSS URLs. |
| `collectFonts` | boolean | `false` | Record web fonts. |
| `recordCanvas` | boolean | `false` | Record `<canvas>` content. Large, so off by default. |
| `sampling` | object | `{mousemove: 50, scroll: 150, input: 'last', canvas: 2}` | rrweb event sampling; ms intervals, and frames per second for `canvas`. |
| `checkoutIntervalMs` | number | `300000` | Take a new FullSnapshot this often while recording live. |
| `packEvents` | boolean | `false` | Compress each event with `@rrweb/packer` and set `co.elastic.replay.packed`. |

## Migration from the POC

| POC (#78) | This document |
| --- | --- |
| scope `elastic-rrweb` | scope `@elastic/opentelemetry-browser/replay` |
| `elastic.rum.log.type: replay` | `eventName: co.elastic.replay.event` |
| `rum.sessionId` | removed, `session.id` only |
| `rr-web.event`, `rr-web.offset` (session-wide, sessionStorage) | `co.elastic.replay.segment.id` + `co.elastic.replay.sequence` |
| `rrweb.type` | `co.elastic.replay.event.type` |
| `rr-web.chunk` (1-based), `rr-web.total-chunks`, on every record | `co.elastic.replay.chunk.index` (0-based), `co.elastic.replay.chunk.count`, only on split events |
| `rrweb.packed` (0/1), on every record | `co.elastic.replay.packed` (boolean), only when `true` |
| `page.url`, `page.url.path` on every record | removed |
| custom body `{type: 99, data: {name: 'replay-started'}}` | `co.elastic.replay.start` log record |
| `rum.has_replay` on all signals | `co.elastic.replay.start` log record |
| `samplingRate: 10`, `errorSamplingRate: 100` (percent) | `sampleRate: 0.1`, `errorSampleRate: 1` |
| `quality.maxChunkBytes` | `replay.maxChunkBytes` |
| `recordCanvas` default `true` | default `false` |

## Open questions

- Is `maskAllText: false` the right default, or should replay mask all text until
  the app opts out? This needs a privacy review.
- Packed bodies are binary strings. Over OTLP/JSON they inflate through escaping,
  which can cancel the compression. We may need a base64 body or to rely on
  transport compression instead; to measure in elastic/observability-dev#6140.
- Do we need `co.elastic.replay.format` on every replay record, so the replay data is
  readable without the start records?
