import { ControllerError } from "server/plugins/engine/errors";
import { Hook } from "../types";
import { TrustPaymentsBillingInformation } from "@xgovformbuilder/model";

/**
 * The hook for the on submit event within the headless summary page
 * for the radon risk report form
 * @param request
 * @param context
 */
export const rpsGetBillingInformation: Hook<
  TrustPaymentsBillingInformation
> = async (request, context) => {
  const { cacheService } = request.service.getServices("cacheService");

  if (await cacheService.isStateFrozen(request)) {
    throw new ControllerError("state is frozen", {
      code: 500,
    });
  }

  const { state } = context;

  return {
    billingFirstName: state["firstName"],
    billingLastName: state["lastName"],
    billingEmailAddress: state["emailAddress"] ?? undefined,
  };
};
