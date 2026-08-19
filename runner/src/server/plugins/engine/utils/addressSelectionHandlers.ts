import { HapiRequest } from "server/types";
import { JsonApiIntegrationWithMsal } from "src/server/services/jsonApiIntegrationWithMsal";
import { Address } from "src/server/services/addressLookupService";
import { ControllerError } from "../errors";
import { getOrCreateCorrelationId } from "server/utils/correlationId";

/**
 * A handler invoked once a user confirms a selected address. Type-specific side
 * effects (e.g. validating an address against a backend database) live here,
 * keyed by name, so the address controllers stay agnostic. A form opts in via
 * the page `options.onAddressSelection` string.
 */
export type AddressSelectionHandler = (
  request: HapiRequest,
  address: Address
) => Promise<void>;

/**
 * Calls the RPS backend service to see if a UDPRN is valid for a risk report
 * @param rpsBackendService - The backend service to check UDPRNs in the database
 * @param parameters - udprn & a back link url for the error pages
 * @returns a session ID if successful
 */
const lookupUdprnInDatabase = async (
  rpsBackendService: JsonApiIntegrationWithMsal,
  {
    udprn,
    uprn,
    sessionId,
    backLinkUrl,
  }: {
    udprn: string;
    uprn: string;
    sessionId: string;
    backLinkUrl: string;
  }
) => {
  try {
    const request = {
      sessionId,
      udprn: udprn.padStart(8, "0"),
      uprn,
    };

    const checkUdprn = await rpsBackendService.request("/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const response = await checkUdprn.json();

    if (response.error) {
      throw new ControllerError("database check not successful", {
        code: 500,
        page: "500-database-check-error",
        backUrl: backLinkUrl,
      });
    }

    if (!response.found) {
      throw new ControllerError("address is not in database", {
        code: 404,
        page: "404-address-not-in-db",
        backUrl: backLinkUrl,
      });
    }

    return sessionId;
  } catch (error) {
    if (error instanceof ControllerError) throw error;

    throw new ControllerError(
      error instanceof Error ? error.message : "unknown error",
      {
        code: 500,
        backUrl: backLinkUrl,
        originalStack: error instanceof Error ? error.stack : undefined,
      }
    );
  }
};

/**
 * Validates a confirmed address against the RPS backend database. Used for the
 * risk-report address journey. Throws a ControllerError (404/500) so the
 * existing error pages render.
 */
const rpsRiskReportOnAddressSelection: AddressSelectionHandler = async (
  request,
  address
) => {
  const rpsBackendServiceName = request.service.getName("rpsBackendService");

  const { cacheService, ...rest } = request.services([]);

  if (rpsBackendServiceName in rest === false) {
    throw new ControllerError("cannot find rps backend service", {
      code: 500,
    });
  }

  const rpsBackendService = rest[
    rpsBackendServiceName
  ] as JsonApiIntegrationWithMsal;

  const currentState = await cacheService.getState(request);
  const progress = currentState.progress || [];
  const backLinkUrl = progress[progress.length - 1];

  await lookupUdprnInDatabase(rpsBackendService, {
    sessionId: getOrCreateCorrelationId(request),
    backLinkUrl,
    udprn: address?.udprn,
    uprn: address?.uprn,
  });
};

/**
 * Registry of handlers that run once an address is confirmed. A form opts a
 * page in via `options.onAddressSelection: "<handlerName>"`.
 */
export const addressSelectionHandlers: Record<
  string,
  AddressSelectionHandler
> = {
  rpsRiskReportOnAddressSelection,
};
