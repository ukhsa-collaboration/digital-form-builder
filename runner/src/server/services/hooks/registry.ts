import {
  rpsGasTestKitOnSummarySubmit,
  RpsGasTestKitOnSummarySubmit,
} from "./rps/rpsGasTestKitOnSummarySubmit";
import {
  rpsRiskReportOnSummarySubmit,
  RpsRiskReportOnSummarySubmit,
} from "./rps/rpsRiskReportOnSummarySubmit";

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
}

export const hookRegistry: HookRegistryEntries = {
  rpsGasTestKitOnSummarySubmit,
  rpsRiskReportOnSummarySubmit,
} as HookRegistryEntries;
