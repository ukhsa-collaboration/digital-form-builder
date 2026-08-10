import { clone } from "hoek";

/**
 * Collates repeat-section state into a flat shape suitable for Joi validation.
 * If the state already has array values (the common case — `progress` is always
 * an array), the original state object is returned unchanged.
 */
export function gatherRepeatPages(
  state: Record<string, any>
): Record<string, any> {
  if (Object.values(state).find((section) => Array.isArray(section))) {
    return state;
  }
  const clonedState = clone(state);
  Object.entries(state).forEach(([key, section]) => {
    if (key === "progress") return;
    if (Array.isArray(section)) {
      clonedState[key] = section.map((pages: any) =>
        Object.values(pages).reduce((acc: {}, p: any) => ({ ...acc, ...p }), {})
      );
    }
  });
  return clonedState;
}
