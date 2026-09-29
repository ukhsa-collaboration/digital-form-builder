import type { FormDefinition } from "./data-model/types";

export function hasFeatureFlag(def: FormDefinition, flag: string): boolean {
  return def.featureFlags?.includes(flag) ?? false;
}
