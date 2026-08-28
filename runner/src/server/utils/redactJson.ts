import { OpenRedaction, createJsonProcessor } from "openredaction";
import { logger } from "./logger";

const detector = new OpenRedaction({
  preset: "gdpr",
});

const jsonProcessor = createJsonProcessor();

/**
 * Redacts PII/sensitive content from a JSON-serializable value using openredaction.
 * For use when logging request/response payloads outside of pino's own pipeline
 * (see redactionTransport.js, which redacts whole log lines). Fails open - both when
 * the log redaction feature flag is off and when detection/redaction itself throws -
 * matching redactionTransport's precedent of never letting a redaction failure
 * silently drop what's being logged.
 */
export async function redactJson<T>(
  value: T,
  skipPaths: string[] = []
): Promise<T> {
  try {
    const detection = await jsonProcessor.detect(value, detector, {
      scanKeys: true,
      skipPaths,
      piiIndicatorKeys: ["firstName", "lastName"],
    });

    return jsonProcessor.redact(value, detection, {
      preserveStructure: true,
      skipPaths,
    });
  } catch (err) {
    logger.warn(err, "Failed to redact JSON payload");
    return value;
  }
}
