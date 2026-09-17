import { ExecutableCondition } from "./models/types";

export type ConditionalCase<T> = { condition?: string; value: T };

export type ConditionsMap = Record<string, ExecutableCondition | undefined>;

/**
 * Resolves a value that is either a plain value or an array of conditional
 * cases evaluated against current form state. The first case whose condition
 * is absent (unconditional default) or evaluates true wins; an unknown
 * condition name is treated as non-matching rather than thrown.
 */
export function resolveConditionalValue<T>(
  value: T | ConditionalCase<T>[],
  state: Record<string, any>,
  conditions: ConditionsMap,
  fallback: T
): T {
  if (!Array.isArray(value)) {
    return value;
  }

  const match = value.find(
    (item) =>
      !item.condition || conditions[item.condition]?.fn?.(state) === true
  );

  return match ? match.value : fallback;
}
