"use strict";

const build = require("pino-abstract-transport");
const { OpenRedaction, createJsonProcessor } = require("openredaction");

/**
 * Recursively parses string values that look like serialised JSON (e.g. a
 * fetch `RequestInit.body`), so the detector can redact individual fields
 * within them instead of collapsing the whole string to a single placeholder.
 */
function expandJsonStrings(value) {
  if (Array.isArray(value)) {
    return value.map(expandJsonStrings);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, expandJsonStrings(val)])
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return expandJsonStrings(JSON.parse(trimmed));
      } catch (err) {
        return value;
      }
    }
  }
  return value;
}

/**
 * Pino transport pipeline stage that redacts PII/sensitive content from every
 * log line using openredaction's JsonProcessor, which walks the parsed log
 * object regardless of its shape (dynamically-named fields, nested structures,
 * free text). Runs in pino's worker thread, upstream of pino-pretty/pino-file.
 */
module.exports = function redactionTransport(opts = {}) {
  const detector = new OpenRedaction();

  const jsonProcessor = createJsonProcessor();

  // Dot-path fields that are never scanned/redacted, e.g. internal identifiers
  // that can look PII-shaped (hapi's `id`) but aren't. Extend via the
  // pipeline target's `options.skipPaths` in logger.ts.
  const skipPaths = opts.skipPaths || [];

  return build(
    async function* (source) {
      for await (const obj of source) {
        try {
          const expanded = expandJsonStrings(obj);

          const detection = await jsonProcessor.detect(expanded, detector, {
            scanKeys: true,
            skipPaths,
          });

          const redacted = jsonProcessor.redact(expanded, detection, {
            preserveStructure: true,
            skipPaths,
          });

          yield JSON.stringify(redacted) + "\n";
        } catch (err) {
          // Never let a redaction failure silently drop a log line.
          yield JSON.stringify(obj) + "\n";
        }
      }
    },
    { enablePipelining: true }
  );
};
