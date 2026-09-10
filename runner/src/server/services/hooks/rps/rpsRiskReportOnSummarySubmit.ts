import { ControllerError } from "server/plugins/engine/errors";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { Hook } from "../types";
import { StoreReportData } from "@xgovformbuilder/model";

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
  const { riskReportApiService, cacheService } = request.service.getServices(
    "riskReportApiService",
    "cacheService"
  );

  if (await cacheService.isStateFrozen(request)) {
    throw new ControllerError("state is frozen", {
      code: 500,
    });
  }

  const { state } = context;

  const selectedRiskReportAddress = state["reportAddress_selectedAddress"];

  if (!selectedRiskReportAddress) {
    throw new ControllerError("cannot find risk report address", {
      code: 500,
    });
  }

  const selectedDeliveryAddress = state["deliveryAddress_selectedAddress"];

  const deliveryMethod = state["deliveryMethod"] as "email" | "post";

  const data = {
    uuid: getOrCreateCorrelationId(request),
    deliveryMethod,
    firstName: state["firstName"],
    lastName: state["lastName"],
    fullAddress: selectedDeliveryAddress?.address,
    email: state["emailAddress"] ?? undefined,
  } as StoreReportData;

  request.logger.trace({ data }, "rpsRiskReportOnSummarySubmit.data");

  const response = await riskReportApiService.storeReport(data);

  if (!response.success) {
    throw new ControllerError("store report details failed", {
      code: 500,
    });
  }
};
