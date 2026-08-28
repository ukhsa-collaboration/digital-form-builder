# Log Redaction

The runner includes a two-layer log redaction system that prevents PII and sensitive data from appearing in log output.

## How it works

Redaction is applied in a pino transport pipeline, which means every log line passes through redaction **before** it reaches the output sink (pino-pretty in development, pino/file in production).

There are two complementary layers:

### 1. PII detection (openredaction)

When `ENABLE_LOG_REDACTION=true`, the `redactionTransport` stage is inserted into the pipeline. It uses [openredaction](https://github.com/openredaction/openredaction) to scan the full log object — including dynamically-named fields and nested structures — and replace detected PII with `[REDACTED]`.

Detected PII categories include (but are not limited to): email addresses, phone numbers, NI numbers, postcodes, and free-text content that matches known sensitive patterns.

The transport also expands JSON-string field values (e.g. a serialised fetch `RequestInit.body`) into objects before scanning, so individual fields within them are redacted selectively rather than collapsing the whole string.

### 2. Path-based static redaction (pino)

`LOG_REDACT_PATHS` accepts a list of dot-notation paths (e.g. `req.headers.authorization`) that are always redacted to `REDACTED`, regardless of their value. This layer runs in pino itself and is independent of the openredaction feature flag.

### Pipeline order

```
log call → pino serializers (header key normalisation)
         → redactionTransport (PII detection, when enabled)
         → pino static path redaction (LOG_REDACT_PATHS)
         → pino-pretty (dev) / pino/file (prod)
```

## Configuration

| Environment variable   | Type                  | Default | Description                                                                       |
| ---------------------- | --------------------- | ------- | --------------------------------------------------------------------------------- |
| `ENABLE_LOG_REDACTION` | boolean               | `false` | Enable the openredaction PII-scanning transport stage                             |
| `LOG_REDACT_PATHS`     | JSON array of strings | `[]`    | Dot-notation paths always redacted by pino (e.g. `["req.headers.authorization"]`) |
| `LOG_LEVEL`            | string                | —       | Pino log level: `trace`, `debug`, `info`, `warn`, `error`                         |
| `LOG_PRETTY_PRINT`     | boolean               | `false` | Format output with pino-pretty (development only)                                 |

## Skipped paths

Certain structural fields look PII-shaped to the detector but are not PII (e.g. hapi's request `id` field). These are excluded from scanning via the `skipPaths` option in [logger.ts](../../runner/src/server/utils/logger.ts):

```ts
const skipPaths: string[] = [
  "id",
  "pid",
  "hostname",
  "level",
  "time",
  "req.id",
  "req.method",
  "req.url",
  "res.statusCode",
  "responseTime",
];
```

To exclude additional fields, add their dot-notation path to this array.

## Behaviour when redaction fails

If the transport throws an error while processing a log line, it emits the original unredacted line rather than dropping it. This ensures log continuity under unexpected conditions; monitor for error-level entries from the transport itself if you need to detect failures.

## Source files

| File                                                                                                                               | Purpose                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [runner/src/server/utils/logger.ts](../../runner/src/server/utils/logger.ts)                                                       | Logger configuration — pipeline assembly, skipPaths, static redact paths |
| [runner/src/server/utils/redactionTransport.js](../../runner/src/server/utils/redactionTransport.js)                               | Pino transport stage — openredaction integration, JSON string expansion  |
| [runner/src/server/utils/**tests**/redactionTransport.test.ts](../../runner/src/server/utils/__tests__/redactionTransport.test.ts) | Unit tests for the transport                                             |
