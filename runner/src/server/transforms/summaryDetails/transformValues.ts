import { SummarySection } from "./types";

/**
 * Replaces the display value of summary items based on their raw value.
 *
 * @param details - The summary sections to transform.
 * @param valueTransforms - A map of `fieldName → { rawValue → replacementDisplayValue }`.
 * @returns A new array of sections with matching item display values replaced.
 *
 * @example
 * ```ts
 * const result = transformValues(sections, {
 *   country: { "GB": "United Kingdom", "US": "United States" },
 * });
 * ```
 */
export function transformValues(
  details: SummarySection[],
  valueTransforms: Record<string, Record<string, string>>
): SummarySection[] {
  return details.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const fieldTransforms = valueTransforms[item.name];
      const replacement = fieldTransforms?.[String(item.rawValue)];
      return replacement !== undefined ? { ...item, value: replacement } : item;
    }),
  }));
}
