import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { resolveSelectedAddress } from "server/plugins/engine/utils/addressUtils";
import { ControllerError } from "server/plugins/engine/errors";
import { Hook } from "../types";
import {
  saveGasTestKitDetailsSchema,
  StoreGtkRequest,
} from "@xgovformbuilder/model/dist/module/schema/rps";
import { redactJson } from "src/server/utils/redactJson";

const toAddressDetails = (address?: {
  address?: string;
  postcode?: string;
  udprn?: string;
}) => ({
  udprn: "00000000",
  fullAddress: address?.address ?? "",
  postcode: address?.postcode ?? "",
});

/**
 * The hook for the on submit event within the headless summary page
 * for the radon home gas test kit form
 * @param request
 * @param context
 */
export const rpsGasTestKitOnSummarySubmit: Hook<void> = async (
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

  const customer: StoreGtkRequest["customer"] = {
    title: state["title"],
    firstName: state["firstName"],
    lastName: state["lastName"],
    email: state["emailAddress"],
    telephone: "dummy-telephone",
  };

  const measurementAddress = resolveSelectedAddress(state, "propertyAddress");

  const kitSameAsProperty = state["kitAddressConfirmation"] === true;
  const resultsSameAsProperty = state["resultsAddressConfirmation"] === true;
  const resultsSameAsKit = state["kitResultsConfirmation"] === true;

  const kitRecipient: StoreGtkRequest["kitRecipient"] = kitSameAsProperty
    ? customer
    : {
        title: state["kitTitle"],
        firstName: state["kitFirstName"],
        lastName: state["kitLastName"],
        email: state["emailAddress"],
        telephone: "dummy-telephone",
      };

  const kitRecipientAddress = kitSameAsProperty
    ? measurementAddress
    : resolveSelectedAddress(state, "kitAddress");

  const resultsUseKit = kitSameAsProperty
    ? resultsSameAsProperty
    : resultsSameAsKit;

  // When the kit goes to a different address but results should still go to the
  // measurement address, the kit-address-results-confirm page is never shown
  // (the form routes directly to /summary), so kitResultsConfirmation is never
  // set. We must check resultsSameAsProperty independently of kitSameAsProperty.
  const resultsUseMeasurement = !kitSameAsProperty && resultsSameAsProperty;

  const resultsRecipient: StoreGtkRequest["resultsRecipient"] = resultsUseKit
    ? kitRecipient
    : resultsUseMeasurement
    ? customer
    : {
        title: state["resultsTitle"],
        firstName: state["resultsFirstName"],
        lastName: state["resultsLastName"],
        email: state["emailAddress"],
        telephone: "dummy-telephone",
      };

  const resultsRecipientAddress = resultsUseKit
    ? kitRecipientAddress
    : resultsUseMeasurement
    ? measurementAddress
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
    await redactJson(rawRequestData),
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
