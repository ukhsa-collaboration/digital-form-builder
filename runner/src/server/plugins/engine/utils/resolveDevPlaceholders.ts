import config from "../../../config";
import { logger } from "../../../utils/logger";

/**
 * Resolves placeholder variables in form configurations. This is a development-only
 * workaround and is a no-op unless `config.isDev` is true.
 * Supports syntax like ${VAR_NAME} which gets replaced with process.env.VAR_NAME values.
 *
 * @example
 *
 * Example form config:
 *   "addressLookupConfig": {
 *     "apimBaseUrl": "${RPS_APIM_BASE_URL}",
 *     "clientId": "${RPS_CLIENT_ID}"
 *   }
 *
 * Environment variables:
 *   RPS_APIM_BASE_URL=https://api.example.com
 *   RPS_CLIENT_ID=abc123
 *
 * Result after resolution:
 *   "addressLookupConfig": {
 *     "apimBaseUrl": "https://api.example.com",
 *     "clientId": "abc123"
 *   }
 */
export function resolveDevPlaceholders<T>(obj: T): T {
  if (!config.isDev) {
    return obj;
  }

  return resolveValue(obj);
}

function resolveValue(value: any): any {
  if (typeof value === "string") {
    return resolveString(value);
  }

  if (Array.isArray(value)) {
    // recursively check all values of the array
    return value.map((item) => resolveValue(item));
  }

  if (value !== null && typeof value === "object") {
    const resolved: any = {};
    // recursively check all values of the object
    for (const key of Object.keys(value)) {
      resolved[key] = resolveValue(value[key]);
    }
    return resolved;
  }

  return value;
}

const PLACEHOLDER_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Resolves placeholders in a configuration object
 *
 * @param str configuration value
 * @returns matched environment value or placeholder
 */
function resolveString(str: string): string {
  return str.replace(PLACEHOLDER_PATTERN, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      logger.warn(
        `[resolveDevPlaceholders] Environment variable '${varName}' not found. Placeholder '${match}' will remain unresolved.`
      );
      return match;
    }
    return value;
  });
}
