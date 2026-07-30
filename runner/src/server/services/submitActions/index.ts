import { ControllerError } from "src/server/plugins/engine/errors";
import { SubmitAction } from "./types";
import { JsonApiIntegrationWithMsal } from "../jsonApiIntegrationWithMsal";
import { saveRiskReportDetailsSchema } from "./saveRiskReportDetailsSchema";

/**
 * Resolved by `summaryConfig.onSubmit.action` in a form's JSON definition.
 * Add new actions as a file in this directory and register them here, e.g.:
 *
 *   import { auditLogAction } from "./auditLogAction";
 *   export const submitActionRegistry: Record<string, SubmitAction> = {
 *     auditLogAction,
 *   };
 */
export const submitActionRegistry: Record<string, SubmitAction> = {
  saveRiskReportDetails: async (request) => {
    const rpsBackendServiceName = request.service.getName("rpsBackendService");

    const { cacheService, ...rest } = request.services([]);
    const currentState = await cacheService.getState(request);

    if (rpsBackendServiceName in rest === false) {
      throw new ControllerError("cannot find rps backend service", {
        code: 500,
      });
    }

    const rpsBackendService = rest[
      rpsBackendServiceName
    ] as JsonApiIntegrationWithMsal;

    const { error, value: requestBody } = saveRiskReportDetailsSchema.validate(
      { ...currentState, telephone: "dummy-telephone" },
      {
        abortEarly: false,
      }
    );

    if (error) {
      throw new ControllerError(
        `Invalid form state for /storereport: ${error.message}`,
        { code: 500 }
      );
    }

    console.log("REQUEST BODY ::", JSON.stringify(requestBody, null, 2));

    await rpsBackendService.request("/storereport", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  },
};

export type { SubmitAction, SubmitActionContext } from "./types";
