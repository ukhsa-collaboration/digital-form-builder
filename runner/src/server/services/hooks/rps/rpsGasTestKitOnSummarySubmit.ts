import Joi from "joi";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { resolveSelectedAddress } from "server/plugins/engine/utils/addressUtils";
import { ControllerError } from "server/plugins/engine/errors";
import { Hook } from "../types";

export type RpsGasTestKitOnSummarySubmit = Hook<void>;

// Matches `PersonalDetails` in gas-test-kit-api-spec.json. This form doesn't
// collect a phone number, so `telephone` defaults to a placeholder.
const personalDetailsSchema = Joi.object({
  title: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  telephone: Joi.string().default("dummy-telephone"),
});

// Matches `AddressDetails` in gas-test-kit-api-spec.json. Only `udprn` is
// required by the spec; manually-entered addresses (no postcode lookup) have
// no UDPRN, so it's allowed to be an empty string.
const addressDetailsSchema = Joi.object({
  udprn: Joi.string().allow("").required(),
  fullAddress: Joi.string().allow("").optional(),
  addressLine1: Joi.string().allow("").optional(),
  addressLine2: Joi.string().allow("").optional(),
  townCity: Joi.string().allow("").optional(),
  country: Joi.string().allow("").optional(),
  postcode: Joi.string().allow("").optional(),
});

// Matches `StoreGTKRequest` in gas-test-kit-api-spec.json, the body posted
// to POST /storegtk.
export const saveGasTestKitDetailsSchema = Joi.object({
  uuid: Joi.string().required(),
  orderNumber: Joi.string().required(),
  customer: personalDetailsSchema.required(),
  measurementAddress: addressDetailsSchema.required(),
  kitRecipient: personalDetailsSchema.required(),
  kitRecipientAddress: addressDetailsSchema.required(),
  resultsRecipient: personalDetailsSchema.required(),
  resultsRecipientAddress: addressDetailsSchema.required(),
  prevTestedAddress: Joi.boolean().required(),
  prevAboveActionLevel: Joi.boolean().required(),
  remediationComplete: Joi.boolean().required(),
}).options({ stripUnknown: true });

type PersonalDetails = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
};

const toAddressDetails = (address?: {
  address?: string;
  postcode?: string;
  udprn?: string;
}) => ({
  udprn: address?.udprn ?? "",
  fullAddress: address?.address ?? "",
  postcode: address?.postcode ?? "",
});

/**
 * The hook for the on submit event within the headless summary page
 * for the radon home gas test kit form
 * @param request
 * @param context
 */
export const rpsGasTestKitOnSummarySubmit: RpsGasTestKitOnSummarySubmit = async (
  request,
  context
) => {
  const { state } = context;
  const { rpsBackendService } = request.service.getServices(
    "rpsBackendService"
  );

  const customer: PersonalDetails = {
    title: state["title"],
    firstName: state["firstName"],
    lastName: state["lastName"],
    email: state["emailAddress"],
  };

  const measurementAddress = resolveSelectedAddress(state, "propertyAddress");

  const kitSameAsProperty = state["kitAddressConfirmation"] === true;
  const resultsSameAsProperty = state["resultsAddressConfirmation"] === true;
  const resultsSameAsKit = state["kitResultsConfirmation"] === true;

  const kitRecipient: PersonalDetails = kitSameAsProperty
    ? customer
    : {
        title: state["kitTitle"],
        firstName: state["kitFirstName"],
        lastName: state["kitLastName"],
        email: state["emailAddress"],
      };

  const kitRecipientAddress = kitSameAsProperty
    ? measurementAddress
    : resolveSelectedAddress(state, "kitAddress");

  const resultsUseKit = kitSameAsProperty
    ? resultsSameAsProperty
    : resultsSameAsKit;

  const resultsRecipient: PersonalDetails = resultsUseKit
    ? kitRecipient
    : {
        title: state["resultsTitle"],
        firstName: state["resultsFirstName"],
        lastName: state["resultsLastName"],
        email: state["emailAddress"],
      };

  const resultsRecipientAddress = resultsUseKit
    ? kitRecipientAddress
    : resolveSelectedAddress(state, "resultsAddress");

  const uuid = getOrCreateCorrelationId(request);

  const rawRequestData = {
    uuid,
    orderNumber: uuid,
    customer,
    measurementAddress: toAddressDetails(measurementAddress),
    kitRecipient,
    kitRecipientAddress: toAddressDetails(kitRecipientAddress),
    resultsRecipient,
    resultsRecipientAddress: toAddressDetails(resultsRecipientAddress),
    prevTestedAddress: state["testedBeforeYesNo"] === true,
    prevAboveActionLevel: state["bqmYesNo"] === true,
    remediationComplete: state["stepsToReduceYesNo"] === true,
  };

  request.logger.trace(
    rawRequestData,
    "rpsGasTestKitOnSummarySubmit.rawRequestData"
  );

  const { error, value: requestBody } = saveGasTestKitDetailsSchema.validate(
    rawRequestData,
    {
      abortEarly: false,
    }
  );

  if (error) {
    throw new ControllerError(
      `Invalid form state for /storegtk: ${error.message}`,
      { code: 500 }
    );
  }

  const response = await rpsBackendService.request("/storegtk", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const body = await response.json();

  if (response.status !== 200 || body.error) {
    throw new ControllerError(
      `Request to save gas test kit details has failed`,
      { code: 500 }
    );
  }
};
