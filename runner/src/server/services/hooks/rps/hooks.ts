import { ControllerError } from "server/plugins/engine/errors";
import { saveGasTestKitDetailsSchema } from "src/server/services/hooks/rps/saveGasTestKitDetailsSchema";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { resolveSelectedAddress } from "server/plugins/engine/utils/addressUtils";
import { Hook } from "../types";
import { JsonApiIntegrationWithMsal } from "../../jsonApiIntegrationWithMsal";
import { saveRiskReportDetailsSchema } from "./saveRiskReportDetailsSchema";

export type RpsGasTestKitOnSummarySubmit = Hook<void>;

export type RpsRiskReportOnSummarySubmit = Hook<void>;

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

  const { error, value: requestBody } = saveRiskReportDetailsSchema.validate(
    {
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
    },
    { abortEarly: false }
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
};

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
