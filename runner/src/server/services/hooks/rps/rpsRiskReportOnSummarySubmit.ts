import Joi from "joi";
import { ControllerError } from "server/plugins/engine/errors";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { Hook } from "../types";
import { JsonApiIntegrationWithMsal } from "../../jsonApiIntegrationWithMsal";

export type RpsRiskReportOnSummarySubmit = Hook<void>;

export const saveRiskReportDetailsSchema = Joi.object({
  uuid: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  deliveryMethod: Joi.string().valid("email", "post").required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .when("deliveryMethod", {
      is: "post",
      then: Joi.optional().allow("", null),
      otherwise: Joi.required(),
    }),
  telephone: Joi.string().default("dummy-telephone"),
  countryCode: Joi.string(),
  fullAddress: Joi.when("deliveryMethod", {
    is: "post",
    then: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
    otherwise: Joi.optional().allow(""),
  }).default("test"),
})
  .rename("emailAddress", "email")
  .rename("deliveryAddress_selectedAddress", "fullAddress")
  .options({ stripUnknown: true });

/**
 * The hook for the on submit event within the headless summary page
 * for the radon risk report form
 * @param request
 * @param context
 */
export const rpsRiskReportOnSummarySubmit: RpsRiskReportOnSummarySubmit = async (
  request
) => {
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

  const rawRequestData = {
    uuid: getOrCreateCorrelationId(request),
    deliveryMethod: currentState["deliveryMethod"],
    countryCode: selectedRiskReportAddress["countryCode"],
    uprn: selectedRiskReportAddress["uprn"],
    udprn: selectedRiskReportAddress["udprn"],
    firstName: currentState["firstName"],
    lastName: currentState["lastName"],
    emailAddress: currentState["emailAddress"],
    deliveryAddress_selectedAddress:
      currentState["deliveryAddress_selectedAddress"],
  };

  request.logger.trace(
    rawRequestData,
    "rpsRiskReportOnSummarySubmit.rawRequestData"
  );

  const { error, value: requestBody } = saveRiskReportDetailsSchema.validate(
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
