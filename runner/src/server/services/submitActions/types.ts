import { Lifecycle } from "@hapi/hapi";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { FormModel, SummaryViewModel } from "server/plugins/engine/models";

export interface SubmitActionContext {
  model: FormModel;
  summaryViewModel: SummaryViewModel;
  parameters?: Record<string, any>;
}

/**
 * Configured via `summaryConfig.onSubmit` and resolved through `submitActionRegistry`.
 * Returning a Hapi response (e.g. `h.redirect(...)`) short-circuits the summary page's
 * submit handler, returning that response immediately instead of continuing the normal
 * outputs/webhookData merge → fee check → pay/status redirect flow. Returning `undefined`
 * lets that normal flow continue unchanged.
 */
export type SubmitAction = (
  request: HapiRequest,
  h: HapiResponseToolkit,
  context: SubmitActionContext
) => Promise<Lifecycle.ReturnValue | void>;
