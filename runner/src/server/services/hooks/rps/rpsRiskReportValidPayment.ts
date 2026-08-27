import { HapiRequest } from "server/types";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { Hook } from "../types";

/**
 * Records a SETTLED payment against the current session's RPS backend order
 * when Trust Payments redirects back with a successfully verified payment.
 */
export const rpsRiskReportValidPayment: Hook<void> = async (
  request: HapiRequest
) => {
  const { rpsBackendService } = request.service.getServices(
    "cacheService",
    "rpsBackendService"
  );

  await rpsBackendService.request("/storepayment", {
    method: "POST",
    body: JSON.stringify({
      uuid: getOrCreateCorrelationId(request),
      transactionId: request.query["transactionreference"],
      settle_status: "SETTLED",
    }),
  });
};
