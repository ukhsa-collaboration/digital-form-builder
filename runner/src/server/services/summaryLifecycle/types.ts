import { Lifecycle } from "@hapi/hapi";
import { HapiRequest } from "server/types";

/**
 * A hook that runs at a specific point in the PluggableSummaryPageController's submit flow.
 *
 * Receives the current Hapi request and a snapshot of the session state.
 * To persist state changes, call `cacheService.mergeState(request, changes)` directly.
 *
 * Returning a Hapi response (e.g. `h.redirect(...)`) short-circuits the remaining
 * controller flow and returns that response immediately.
 * Returning `void` or `undefined` lets the flow continue.
 */
export type SummaryLifecycleHook = (
  request: HapiRequest,
  state: Record<string, any>
) => Promise<Lifecycle.ReturnValue | void>;
