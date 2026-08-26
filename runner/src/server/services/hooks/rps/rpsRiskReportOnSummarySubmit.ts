import { ControllerError } from "server/plugins/engine/errors";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { Hook } from "../types";
import { JsonApiIntegrationWithMsal } from "../../jsonApiIntegrationWithMsal";
import {
  StoreReportRequest,
  storeReportRequestSchema,
} from "@xgovformbuilder/model/dist/module/schema/rps";

/**
 * The hook for the on submit event within the headless summary page
 * for the radon risk report form
 * @param request
 * @param context
 */
export const rpsRiskReportOnSummarySubmit: Hook<void> = async (request) => {
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

  if (!selectedRiskReportAddress)
    throw new ControllerError("cannot find risk report address", {
      code: 500,
    });

  const selectedDeliveryAddress =
    currentState["deliveryAddress_selectedAddress"];

  const rawRequestData: StoreReportRequest = {
    uuid: getOrCreateCorrelationId(request),
    deliveryMethod: currentState["deliveryMethod"],
    countryCode: selectedRiskReportAddress["countryCode"],
    firstName: currentState["firstName"],
    lastName: currentState["lastName"],
    email: currentState["emailAddress"],
    telephone: "dummy-phone",
    ...(selectedDeliveryAddress
      ? { fullAddress: selectedDeliveryAddress.address }
      : {}),
  };

  request.logger.trace(
    rawRequestData,
    "rpsRiskReportOnSummarySubmit.rawRequestData"
  );

  const { error, value: requestBody } = storeReportRequestSchema.validate(
    rawRequestData,
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

  request.logger.trace(requestBody, "rpsRiskReportOnSummarySubmit.requestBody");

  const response = await rpsBackendService.request("/storereport", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const body = await response.json();

  request.logger.trace(
    { status: response.status, body },
    "rpsRiskReportOnSummarySubmit.response"
  );

  if (response.status !== 200 || body.error) {
    throw new ControllerError(`Request to save report details has failed`, {
      code: 500,
    });
  }
};
