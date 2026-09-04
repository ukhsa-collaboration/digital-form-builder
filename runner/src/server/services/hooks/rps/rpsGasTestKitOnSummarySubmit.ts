import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { resolveSelectedAddress } from "server/plugins/engine/utils/addressUtils";
import { ControllerError } from "server/plugins/engine/errors";
import { Hook } from "../types";
import { StoreGtkData } from "@xgovformbuilder/model";

const toAddressDetails = (address?: {
  address?: string;
  postcode?: string;
}) => ({
  fullAddress: address?.address ?? "",
  postcode: address?.postcode ?? "",
  udprn: "00000000",
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
  const { gasTestKitApiService, cacheService } = request.service.getServices(
    "gasTestKitApiService",
    "cacheService"
  );

  if (await cacheService.isStateFrozen(request)) {
    throw new ControllerError("state is frozen", {
      code: 500,
    });
  }

  const { state } = context;

  const customer: StoreGtkData["customer"] = {
    title: state["title"],
    firstName: state["firstName"],
    lastName: state["lastName"],
    email: state["emailAddress"],
    telephone: "07999999999",
  };

  const measurementAddress = resolveSelectedAddress(state, "propertyAddress");

  const kitSameAsProperty = state["kitAddressConfirmation"] === true;
  const resultsSameAsProperty = state["resultsAddressConfirmation"] === true;
  const resultsSameAsKit = state["kitResultsConfirmation"] === true;

  const kitRecipient: StoreGtkData["kitRecipient"] = kitSameAsProperty
    ? customer
    : {
        title: state["kitTitle"],
        firstName: state["kitFirstName"],
        lastName: state["kitLastName"],
        email: "no-reply@ukhsa.gov.uk",
        telephone: "07999999999",
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

  const resultsRecipient: StoreGtkData["resultsRecipient"] = resultsUseKit
    ? kitRecipient
    : resultsUseMeasurement
    ? customer
    : {
        title: state["resultsTitle"],
        firstName: state["resultsFirstName"],
        lastName: state["resultsLastName"],
        email: "no-reply@ukhsa.gov.uk",
        telephone: "07999999999",
      };

  const resultsRecipientAddress = resultsUseKit
    ? kitRecipientAddress
    : resultsUseMeasurement
    ? measurementAddress
    : resolveSelectedAddress(state, "resultsAddress");

  const uuid = getOrCreateCorrelationId(request);

  const data: StoreGtkData = {
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

  request.logger.trace({ data }, "rpsGasTestKitOnSummarySubmit.data");

  const response = await gasTestKitApiService.storeGtk(data);

  if (!response.uuid) {
    throw new ControllerError("store gtk details failed", {
      code: 500,
    });
  }
};
