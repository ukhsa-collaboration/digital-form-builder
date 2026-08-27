import { ControllerError } from "server/plugins/engine/errors";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { Hook } from "../types";
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
export const rpsRiskReportOnSummarySubmit: Hook<void> = async (
  request,
  context
) => {
  const { rpsBackendService, cacheService } = request.service.getServices(
    "rpsBackendService",
    "cacheService"
  );

  if (await cacheService.isStateFrozen(request)) {
    throw new ControllerError("state is frozen", {
      code: 500,
    });
  }

  const { state } = context;

  const selectedRiskReportAddress = state["reportAddress_selectedAddress"];

  if (!selectedRiskReportAddress)
    throw new ControllerError("cannot find risk report address", {
      code: 500,
    });

  const selectedDeliveryAddress = state["deliveryAddress_selectedAddress"];

  const deliveryMethod = state["deliveryMethod"] as "email" | "post";

  const rawRequestData: StoreReportRequest = {
    uuid: getOrCreateCorrelationId(request),
    deliveryMethod,
    firstName: state["firstName"],
    lastName: state["lastName"],
    telephone: "dummy-phone",
    fullAddress: selectedDeliveryAddress?.address ?? "dummy-address",
    countryCode: selectedRiskReportAddress["countryCode"],
    email: state["emailAddress"] ?? undefined,
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
