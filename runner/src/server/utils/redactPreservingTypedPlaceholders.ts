type PiiMatch = {
  placeholder: string;
  position: [number, number];
};

type DetectionResult = {
  matchesByPath: Record<string, PiiMatch[]>;
};

/**
 * Structure-preserving redaction that reads each field's typed placeholder
 * (e.g. [EMAIL_4821]) from detection.matchesByPath instead of hardcoding
 * "[REDACTED]".
 */
function applyPlaceholdersToString(value: string, matches: PiiMatch[]): string {
  const byLastPositionFirst = [...matches].sort(
    (a, b) => b.position[0] - a.position[0]
  );
  let result = value;
  for (const match of byLastPositionFirst) {
    result =
      result.slice(0, match.position[0]) +
      match.placeholder +
      result.slice(match.position[1]);
  }
  return result;
}

/**
 * Non-string fields can't have their placeholder spliced into position, so
 * they're replaced wholesale: emptied for numbers/booleans/collections, or
 * given the first match's placeholder as a fallback.
 */
function redactMatchedValue(value: unknown, matches: PiiMatch[]): unknown {
  if (typeof value === "string")
    return applyPlaceholdersToString(value, matches);
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [];
  if (typeof value === "object" && value !== null) return {};
  return matches[0]?.placeholder ?? "[REDACTED]";
}

function childPath(parentPath: string, key: string): string {
  return parentPath ? `${parentPath}.${key}` : key;
}

export function redactPreservingTypedPlaceholders<T>(
  data: T,
  detection: DetectionResult,
  skipPaths: string[] = []
): T {
  const { matchesByPath } = detection;
  const skipSet = new Set(skipPaths);

  const redactValue = (value: unknown, currentPath: string): unknown => {
    if (skipSet.has(currentPath)) return value;

    const matches = matchesByPath[currentPath];
    if (matches && matches.length > 0) {
      return redactMatchedValue(value, matches);
    }

    if (Array.isArray(value)) {
      return value.map((item, i) => redactValue(item, `${currentPath}[${i}]`));
    }
    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as object)) {
        result[key] = redactValue(val, childPath(currentPath, key));
      }
      return result;
    }
    return value;
  };

  return redactValue(data, "") as T;
}
