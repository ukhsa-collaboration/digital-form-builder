import { OpenRedaction, createJsonProcessor } from "openredaction";
import {
  logger,
  skipPaths as defaultSkipPaths,
  alwaysRedact as defaultAlwaysRedact,
} from "./logger";
import { redactPreservingTypedPlaceholders } from "./redactPreservingTypedPlaceholders";

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
  skipPaths: string[] = defaultSkipPaths,
  alwaysRedact: string[] = defaultAlwaysRedact
): Promise<T> {
  try {
    const detection = await jsonProcessor.detect(value, detector, {
      scanKeys: true,
      skipPaths,
      alwaysRedact,
    });

    return redactPreservingTypedPlaceholders(value, detection, skipPaths);
  } catch (err) {
    logger.warn(err, "Failed to redact JSON payload");
    return value;
  }
}
