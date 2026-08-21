import {
  rpsGasTestKitOnSummarySubmit,
  RpsGasTestKitOnSummarySubmit,
} from "./rps/rpsGasTestKitOnSummarySubmit";
import {
  rpsRiskReportOnSummarySubmit,
  RpsRiskReportOnSummarySubmit,
} from "./rps/rpsRiskReportOnSummarySubmit";
import {
  rpsRiskReportInvalidPayment,
  RpsRiskReportInvalidPayment,
} from "./rps/rpsRiskReportInvalidPayment";
import {
  rpsRiskReportValidPayment,
  RpsRiskReportValidPayment,
} from "./rps/rpsRiskReportValidPayment";

/**
 * Global registry of named hook handlers. Add entries here as hooks are
 * implemented. Each entry should declare its specific return type via the
 * `Hook<TReturn>` generic, e.g.:
 *
 *   import { Hook } from "./types";
 *   import { auditLogHook } from "./auditLogHook";
 *
 *   export interface HookRegistryEntries {
 *     auditLogHook: Hook<void>;
 *   }
 *
 * The special config value `"void"` is handled by the dispatcher before it
 * reaches this registry — it is a no-op placeholder and never needs an entry.
 */
export interface HookRegistryEntries {
  rpsGasTestKitOnSummarySubmit: RpsGasTestKitOnSummarySubmit;
  rpsRiskReportOnSummarySubmit: RpsRiskReportOnSummarySubmit;
  rpsRiskReportInvalidPayment: RpsRiskReportInvalidPayment;
  rpsRiskReportValidPayment: RpsRiskReportValidPayment;
}

export const hookRegistry: HookRegistryEntries = {
  rpsGasTestKitOnSummarySubmit,
  rpsRiskReportOnSummarySubmit,
  rpsRiskReportInvalidPayment,
  rpsRiskReportValidPayment,
};

/** A registered hook's lookup key, i.e. one of `hookRegistry`'s own record keys. */
export type HookAction = keyof HookRegistryEntries;

export function isHookAction(action: string): action is HookAction {
  return action in hookRegistry;
}
