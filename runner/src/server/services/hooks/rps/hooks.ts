import { ControllerError } from "server/plugins/engine/errors";
import { saveGasTestKitDetailsSchema } from "server/services/submitActions/saveGasTestKitDetailsSchema";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { resolveSelectedAddress } from "server/plugins/engine/utils/addressUtils";
import { Hook } from "../types";

export type RpsGasTestKitOnSummarySubmit = Hook<void>;

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

  let kitRecipient: PersonalDetails;
  let kitRecipientAddress: ReturnType<typeof resolveSelectedAddress>;
  let resultsRecipient: PersonalDetails;
  let resultsRecipientAddress: ReturnType<typeof resolveSelectedAddress>;

  if (kitSameAsProperty) {
    kitRecipient = customer;
    kitRecipientAddress = measurementAddress;

    if (resultsSameAsProperty) {
      resultsRecipient = customer;
      resultsRecipientAddress = measurementAddress;
    } else {
      resultsRecipient = {
        title: state["resultsTitle"],
        firstName: state["resultsFirstName"],
        lastName: state["resultsLastName"],
        email: state["emailAddress"],
      };
      resultsRecipientAddress = resolveSelectedAddress(state, "resultsAddress");
    }
  } else {
    kitRecipient = {
      title: state["kitTitle"],
      firstName: state["kitFirstName"],
      lastName: state["kitLastName"],
      email: state["emailAddress"],
    };
    kitRecipientAddress = resolveSelectedAddress(state, "kitAddress");

    if (resultsSameAsKit) {
      resultsRecipient = kitRecipient;
      resultsRecipientAddress = kitRecipientAddress;
    } else {
      resultsRecipient = {
        title: state["resultsTitle"],
        firstName: state["resultsFirstName"],
        lastName: state["resultsLastName"],
        email: state["emailAddress"],
      };
      resultsRecipientAddress = resolveSelectedAddress(state, "resultsAddress");
    }
  }

  const uuid = getOrCreateCorrelationId(request);

  const { error, value: requestBody } = saveGasTestKitDetailsSchema.validate(
    {
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
    },
    { abortEarly: false }
  );

  if (error) {
    throw new ControllerError(
      `Invalid form state for /storegtk: ${error.message}`,
      { code: 500 }
    );
  }

  request.logger.trace(
    ["rpsGasTestKitOnSummarySubmit::Request"],
    JSON.stringify({
      request: requestBody,
    })
  );

  const response = await rpsBackendService.request("/storegtk", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  request.logger.trace(
    ["rpsGasTestKitOnSummarySubmit::Response"],
    JSON.stringify({
      status: response.status,
      headers: response.headers,
      response: await response.json(),
    })
  );
};
