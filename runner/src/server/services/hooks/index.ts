import { HapiRequest } from "server/types";
import { ControllerError } from "server/plugins/engine/errors";
import { hookRegistry, isHookAction } from "./registry";
import { HookModel, HookState } from "./types";

/**
 * Looks up and runs the hook configured in the form's top-level `hooks` block
 * under `hookName`, if any. Returns `undefined` when no hook is configured or
 * the value is `"void"`.
 *
 * Callers pass their own lookup key, typically `"<ControllerName|ServiceName>.<event>"`:
 *   runHook("HeadlessSummaryPageController.onSubmit", request, { model, state })
 */
export async function runHook(
  hookName: string,
  request: HapiRequest,
  context: {
    model: HookModel;
    state?: HookState;
  }
) {
  const actionName = context.model.def.hooks?.[hookName];

  if (!actionName || actionName === "void") {
    request.logger.trace([
      "runHook",
      `No hook configured for '${hookName}', skipping`,
    ]);

    return;
  }

  request.logger.trace([
    "runHook",
    `Running hook '${actionName}' for '${hookName}'`,
  ]);

  if (!isHookAction(actionName)) {
    request.logger.trace([
      "runHook",
      `Unknown hook action '${actionName}' for '${hookName}'`,
    ]);

    throw new ControllerError(`Unknown hook action '${actionName}'`, {
      code: 500,
    });
  }

  const hook = hookRegistry[actionName];

  const { cacheService } = request.service.getServices("cacheService");

  const state: HookState =
    context.state ?? (await cacheService.getState(request));

  const result = await hook(request, { state, model: context.model });

  request.logger.trace([
    "runHook",
    `Hook '${actionName}' for '${hookName}' completed`,
  ]);

  return result;
}

export { hookRegistry } from "./registry";
export type { Hook, HookContext } from "./types";
