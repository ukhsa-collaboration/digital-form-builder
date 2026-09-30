import { Address } from "src/server/services/addressLookupService";
import { getOrCreateCorrelationId } from "server/utils/correlationId";
import { ControllerError } from "server/plugins/engine/errors";
import { RiskReportApiService } from "src/server/services/riskReportApiService";
import { Hook } from "../types";

const lookupUdprnInDatabase = async (
  riskReportApiService: RiskReportApiService,
  {
    udprn,
    address,
    sessionId,
    backLinkUrl,
  }: {
    udprn: string;
    address: Address;
    sessionId: string;
    backLinkUrl: string;
  }
) => {
  try {
    const response = await riskReportApiService.lookupAddress({
      uuid: sessionId,
      udprn: udprn.padStart(8, "0"),
      countryCode: address.countryCode as "E" | "W" | "S" | "N",
      fullAddress: address.address,
    });

    if (!response.success) {
      throw new ControllerError("database check not successful", {
        code: 500,
        page: "500-database-check-error",
        backUrl: backLinkUrl,
      });
    }

    if (!response.data.found) {
      throw new ControllerError("address is not in database", {
        code: 404,
        page: "404-address-not-in-db",
        backUrl: backLinkUrl,
        data: {
          findAnAddressUrl: "./find-a-report-address",
        },
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

export const rpsRiskReportOnAddressSelection: Hook<
  void,
  { address?: Address }
> = async (request, { state }) => {
  if (!state.address) {
    throw new ControllerError("cannot find selected address", {
      code: 500,
    });
  }

  const { riskReportApiService, cacheService } = request.service.getServices(
    "riskReportApiService",
    "cacheService"
  );

  if (await cacheService.isStateFrozen(request)) {
    throw new ControllerError("state is frozen", {
      code: 500,
    });
  }

  const currentState = await cacheService.getState(request);
  const progress = currentState.progress || [];
  const backLinkUrl = progress[progress.length - 1];

  await lookupUdprnInDatabase(riskReportApiService, {
    sessionId: getOrCreateCorrelationId(request),
    backLinkUrl,
    udprn: state.address.udprn,
    address: state.address,
  });
};
