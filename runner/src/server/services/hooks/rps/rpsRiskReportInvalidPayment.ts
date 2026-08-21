import { HapiRequest } from "server/types";
import { Hook } from "../types";

export type RpsRiskReportInvalidPayment = Hook<void>;

/**
 * Records a NOT_SETTLED payment against the current session's RPS backend
 * order when Trust Payments redirects back with an invalid/failed payment.
 */
export const rpsRiskReportInvalidPayment: RpsRiskReportInvalidPayment = async (
  request: HapiRequest
) => {
  const { cacheService, rpsBackendService } = request.service.getServices(
    "cacheService",
    "rpsBackendService"
  );

  const currentState = await cacheService.getState(request);

  await rpsBackendService.request("/storepayment", {
    method: "POST",
    body: JSON.stringify({
      uuid: currentState["sessionId"],
      transactionId: request.query["transactionreference"],
      settle_status: "NOT_SETTLED",
    }),
  });
};
