import { Lifecycle } from "@hapi/hapi";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { FormModel } from "server/plugins/engine/models";

export type HookState = Record<string, any>;

export type HookModel = FormModel;

export interface HookContext {
  h: HapiResponseToolkit;
  model: HookModel;
  state: HookState;
}

/**
 * A hook that runs at a point in a page controller's lifecycle, configured
 * per-form via the top-level `hooks` block and resolved through `hookRegistry`.
 *
 * The generic `TReturn` lets each registry entry declare its specific return
 * type. Returning a Hapi response short-circuits the calling controller's flow;
 * returning `void` lets it continue.
 */
export type Hook<TReturn = Lifecycle.ReturnValue | void> = (
  request: HapiRequest,
  context: HookContext
) => Promise<TReturn>;
