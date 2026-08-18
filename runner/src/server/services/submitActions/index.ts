import { createHash } from "crypto";
import { ControllerError } from "src/server/plugins/engine/errors";
import { SubmitAction } from "./types";
import { JsonApiIntegrationWithMsal } from "../jsonApiIntegrationWithMsal";
import { saveRiskReportDetailsSchema } from "./saveRiskReportDetailsSchema";
import { saveGasTestKitDetailsSchema } from "./saveGasTestKitDetailsSchema";
import { getOrCreateCorrelationId } from "../../utils/correlationId";
import { resolveSelectedAddress } from "../../plugins/engine/utils/addressUtils";

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
 * Derives a placeholder order number from the session's correlation id.
 */
const deriveOrderNumber = (uuid: string): string => {
  const digits = createHash("sha256")
    .update(uuid)
    .digest("hex")
    .replace(/\D/g, "")
    .padEnd(8, "0")
    .slice(0, 8);
  return `RRR-${digits}`;
};

/**
 * Resolved by `summaryConfig.onSubmit.action` in a form's JSON definition.
 * Add new actions as a file in this directory and register them here, e.g.:
 *
 *   import { auditLogAction } from "./auditLogAction";
 *   export const submitActionRegistry: Record<string, SubmitAction> = {
 *     auditLogAction,
 *   };
 */
export const submitActionRegistry: Record<string, SubmitAction> = {
  saveRiskReportDetails: async (request) => {
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
    const selectedDeliveryAddress =
      currentState["deliveryAddress_selectedAddress"];

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
        fullAddress: selectedDeliveryAddress["address"],
        // customer details
        firstName: currentState["firstName"],
        lastName: currentState["lastName"],
        emailAddress: currentState["emailAddress"],
        deliveryAddress_selectedAddress:
          currentState["deliveryAddress_selectedAddress"],
      },
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

    await rpsBackendService.request("/storereport", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  },

  saveGasTestKitDetails: async (request) => {
    const gtkBackendServiceName = request.service.getName("gtkBackendService");

    const { cacheService, ...rest } = request.services([]);
    const currentState = await cacheService.getState(request);

    if (gtkBackendServiceName in rest === false) {
      throw new ControllerError("cannot find gtk backend service", {
        code: 500,
      });
    }

    const gtkBackendService = rest[
      gtkBackendServiceName
    ] as JsonApiIntegrationWithMsal;

    const customer: PersonalDetails = {
      title: currentState["Title"],
      firstName: currentState["FirstName"],
      lastName: currentState["LastName"],
      email: currentState["EmailAddress"],
    };

    const measurementAddress = resolveSelectedAddress(
      currentState,
      "propertyAddress"
    );

    // The kit-delivery and results-delivery recipient/address only have
    // their own pages when they differ from the property (and, for results,
    // from the kit address) — otherwise they fall back to whichever address
    // was confirmed as "the same".
    const deliverySameAsProperty =
      currentState["deliveryAddressConfirmation"] === true;
    const resultsSameAsProperty =
      currentState["resultsAddressConfirmation"] === true;
    const resultsSameAsKit =
      currentState["deliveryResultsConfirmation"] === true;

    let kitRecipient: PersonalDetails;
    let kitRecipientAddress: ReturnType<typeof resolveSelectedAddress>;
    let resultsRecipient: PersonalDetails;
    let resultsRecipientAddress: ReturnType<typeof resolveSelectedAddress>;

    if (deliverySameAsProperty) {
      kitRecipient = customer;
      kitRecipientAddress = measurementAddress;

      if (resultsSameAsProperty) {
        resultsRecipient = customer;
        resultsRecipientAddress = measurementAddress;
      } else {
        resultsRecipient = {
          title: currentState["ResultsTitle"],
          firstName: currentState["ResultsFirstName"],
          lastName: currentState["ResultsLastName"],
          email: currentState["EmailAddress"],
        };

        resultsRecipientAddress = resolveSelectedAddress(
          currentState,
          "resultsAddress"
        );
      }
    } else {
      kitRecipient = {
        title: currentState["KitTitle"],
        firstName: currentState["KitFirstName"],
        lastName: currentState["KitLastName"],
        email: currentState["EmailAddress"],
      };

      kitRecipientAddress = resolveSelectedAddress(currentState, "kitAddress");

      if (resultsSameAsKit) {
        resultsRecipient = kitRecipient;
        resultsRecipientAddress = kitRecipientAddress;
      } else {
        resultsRecipient = {
          title: currentState["ResultsTitle"],
          firstName: currentState["ResultsFirstName"],
          lastName: currentState["ResultsLastName"],
          email: currentState["EmailAddress"],
        };

        resultsRecipientAddress = resolveSelectedAddress(
          currentState,
          "resultsAddress"
        );
      }
    }

    const uuid = getOrCreateCorrelationId(request);

    const { error, value: requestBody } = saveGasTestKitDetailsSchema.validate(
      {
        uuid,
        orderNumber: deriveOrderNumber(uuid),
        customer,
        measurementAddress: toAddressDetails(measurementAddress),
        kitRecipient,
        kitRecipientAddress: toAddressDetails(kitRecipientAddress),
        resultsRecipient,
        resultsRecipientAddress: toAddressDetails(resultsRecipientAddress),
        prevTestedAddress: currentState["testedBeforeYesNo"] === true,
        prevAboveActionLevel: currentState["bqmYesNo"] === true,
        remediationComplete: currentState["stepsToReduceYesNo"] === true,
      },
      { abortEarly: false }
    );

    if (error) {
      throw new ControllerError(
        `Invalid form state for /storegtk: ${error.message}`,
        { code: 500 }
      );
    }

    await gtkBackendService.request("/storegtk", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  },
};

export type { SubmitAction, SubmitActionContext } from "./types";
