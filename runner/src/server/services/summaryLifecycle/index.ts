import { HapiRequest } from "server/types";
import { ControllerError } from "server/plugins/engine/errors";
import { SummaryLifecycleHook } from "./types";

/**
 * Runs before form validation. Use to pre-process request data or modify session
 * state before the summary controller validates form completeness.
 */
export const onBeforeSubmitRegistry: Record<string, SummaryLifecycleHook> = {};

/**
 * Runs after validation and after `userCompletedSummary` is persisted.
 * Use to send form data to a backend, trigger external workflows, etc.
 */
export const onSubmitRegistry: Record<string, SummaryLifecycleHook> = {};

/**
 * Runs after `onSubmit`. Use for audit logging, notifications, or cleanup
 * before the user is handed off to the payment provider.
 */
export const onAfterSubmitRegistry: Record<string, SummaryLifecycleHook> = {};

export async function runHook(
  registry: Record<string, SummaryLifecycleHook>,
  actionName: string,
  request: HapiRequest,
  state: Record<string, any>
) {
  const hook = registry[actionName];

  if (!hook) {
    throw new ControllerError(
      `Unknown summary lifecycle action '${actionName}'`,
      { code: 500 }
    );
  }

  return hook(request, state);
}

export type { SummaryLifecycleHook };
