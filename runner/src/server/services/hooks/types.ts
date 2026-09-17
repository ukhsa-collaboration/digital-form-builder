import { HapiRequest } from "server/types";
import { FormModel } from "server/plugins/engine/models";

export type HookState = Record<string, any>;

export type HookModel = FormModel;

export interface HookContext {
  model: HookModel;
  state: HookState;
}

/**
 * A side effect that runs at a point in a form's lifecycle, configured
 * per-form via the top-level `hooks` block and resolved through `hookRegistry`.
 *
 * A hook may return data describing its outcome (via the `TReturn` generic),
 * but it never receives the Hapi response toolkit and never controls the
 * journey itself — it cannot redirect or short-circuit its caller. A caller
 * that wants to act on a hook's return value reads it and does so explicitly,
 * using its own tools. A failing hook should throw (e.g. `ControllerError`),
 * which is handled generically by the request lifecycle.
 */
export type Hook<TReturn = void> = (
  request: HapiRequest,
  context: HookContext
) => Promise<TReturn>;
