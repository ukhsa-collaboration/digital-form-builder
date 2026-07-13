import config from "../../../config";

/**
 * Resolves placeholder variables in form configurations during development.
 * Supports syntax like ${VAR_NAME} which gets replaced with process.env.VAR_NAME values.
 *
 * This function only operates when NODE_ENV is 'development'.
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
export function resolvePlaceholders<T>(obj: T): T {
  if (config.env !== "development") {
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
      console.warn(
        `[resolvePlaceholders] Environment variable '${varName}' not found. Placeholder '${match}' will remain unresolved.`
      );
      return match;
    }
    return value;
  });
}
