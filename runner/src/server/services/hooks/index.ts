import { HapiRequest, HapiResponseToolkit } from "server/types";
import { ControllerError } from "server/plugins/engine/errors";
import { hookRegistry } from "./registry";
import { Hook, HookModel, HookState } from "./types";

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
  const hookKey = `${controllerName}.${hookName}`;
  const actionName = context.model.def.hooks?.[hookKey];

  if (!actionName || actionName === "void") {
    request.logger.trace([
      "runHook",
      `No hook configured for '${hookKey}', skipping`,
    ]);

    return;
  }

  request.logger.trace([
    "runHook",
    `Running hook '${actionName}' for '${hookKey}'`,
  ]);

  const hook = hookRegistry[actionName] as Hook;

  if (!hook) {
    request.logger.trace([
      "runHook",
      `Unknown hook action '${actionName}' for '${hookKey}'`,
    ]);

    throw new ControllerError(`Unknown hook action '${actionName}'`, {
      code: 500,
    });
  }

  const { cacheService } = request.service.getServices("cacheService");

  const state: HookState =
    context.state ?? (await cacheService.getState(request));

  const result = await hook(request, { h, state, model: context.model });

  request.logger.trace([
    "runHook",
    `Hook '${actionName}' for '${hookKey}' completed`,
  ]);

  return result;
}

export { hookRegistry } from "./registry";
export type { Hook, HookContext } from "./types";
