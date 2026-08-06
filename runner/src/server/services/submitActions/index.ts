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

    const selectedRiskReportAddress =
      currentState["reportAddress_selectedAddress"];
    const selectedDeliveryAddress =
      currentState["deliveryAddress_selectedAddress"];

    if (!selectedRiskReportAddress)
      throw new ControllerError("cannot find risk report address", {
        code: 500,
      });

    const { error, value: requestBody } = saveRiskReportDetailsSchema.validate(
      {
        uuid: request.yar.id,
        deliveryMethod: currentState["deliveryMethod"],
        countryCode: selectedRiskReportAddress["countryCode"],
        uprn: selectedRiskReportAddress["uprn"],
        udprn: selectedRiskReportAddress["udprn"],
        fullAddress: selectedDeliveryAddress["address"],
        // customer details
        firstName: currentState["firstName"],
        lastName: currentState["lastName"],
        emailAddress: currentState["emailAddress"],
        deliveryAddress_selectedAddress:
          currentState["deliveryAddress_selectedAddress"],
      },
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

    await rpsBackendService.request("/storereport", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  },
};

export type { SubmitAction, SubmitActionContext } from "./types";
