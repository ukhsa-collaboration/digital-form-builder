import pino from "pino";
import config from "../config";

const isPretty =
  config.logPrettyPrint === "true" || config.logPrettyPrint === true;

const lowercaseHeaderKeys = (
  headers: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );

const options: pino.LoggerOptions = {
  level: config.logLevel,
  ...(isPretty && { transport: { target: "pino-pretty" } }),
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    // Normalize header keys to lowercase before redaction runs, so redact paths
    // only need one case variant regardless of how the caller set the header name.
    headers: lowercaseHeaderKeys,
  },
  redact: {
    paths: config.logRedactPaths,
    censor: "REDACTED",
  },
};

export const logger = pino(options);

export type Logger = pino.Logger;

/**
 * Creates a child logger that inherits the root logger's level, formatters, and redaction config.
 *
 * Bindings are key-value pairs merged into every log entry produced by the child. Common values:
 *
 * | Key       | Type     | Purpose                                               | Example                          |
 * |-----------|----------|-------------------------------------------------------|----------------------------------|
 * | `name`    | `string` | Identifies the subsystem or module producing the log  | `{ name: "gtkBackend" }`         |
 * | `service` | `string` | Service or worker name when running multiple services | `{ service: "queue-worker" }`    |
 * | `requestId` | `string` | Correlation ID for tracing a request across services | `{ requestId: req.id }`          |
 * | `userId`  | `string` | Authenticated user identifier (avoid PII)             | `{ userId: session.userId }`     |
 * | `formId`  | `string` | Form or configuration identifier                      | `{ formId: "rps-risk-report" }`  |
 *
 * Any additional string-keyed, JSON-serializable values are valid. Bindings containing paths
 * listed in `logRedactPaths` will be redacted as `"REDACTED"` automatically.
 *
 * Values that are **not** valid: functions, class instances, `undefined`, circular references,
 * and `BigInt` (pino will throw or silently drop them).
 */
export const createChildLogger = (bindings: Record<string, unknown>) =>
  logger.child(bindings);
