import { HapiRequest, HapiResponseToolkit } from "server/types";
import { ControllerError } from "server/plugins/engine/errors";
import { hookRegistry } from "./registry";
import { Hook, HookContext, HookModel, HookState } from "./types";

/**
 * Looks up and runs the hook configured in the form's top-level `hooks` block
 * for `"<controllerName>.<hookName>"`, if any. Returns `undefined` when no
 * hook is configured or the value is `"void"`.
 *
 * Controllers call this directly, passing their own class name:
 *   runHook(this.constructor.name, "onSubmit", request, h, { model, state })
 */
export async function runHook(
  controllerName: string,
  hookName: string,
  request: HapiRequest,
  h: HapiResponseToolkit,
  context: {
    model: HookModel;
    state?: HookState;
  }
) {
  const actionName = context.model.def.hooks?.[`${controllerName}.${hookName}`];

  if (!actionName || actionName === "void") {
    return;
  }

  const hook = hookRegistry[actionName] as Hook;

  if (!hook) {
    throw new ControllerError(`Unknown hook action '${actionName}'`, {
      code: 500,
    });
  }

  const { cacheService } = request.service.getServices("cacheService");

  const state: HookState =
    context.state ?? (await cacheService.getState(request));

  return hook(request, { h, state, model: context.model });
}

export { hookRegistry } from "./registry";
export type { Hook, HookContext } from "./types";
