import { http, HttpResponse, RequestHandler } from "msw";
import { createChildLogger } from "../../utils/logger";
import {
  lookupAddressRequestSchema,
  LookupResponse,
  storeReportRequestSchema,
  StoreReportResponse,
} from "@xgovformbuilder/model";

const logger = createChildLogger({ name: "rpsRiskReportBackend" });

/**
 * Post request to store customer details & delivery address (if delivery method is `Post`).
 */
const storeReportDetailsEndpoint = http.post(
  "*/storereport",
  async ({ request }) => {
    const validated = storeReportRequestSchema.validate(await request.json());

    if (validated.error) {
      logger.error(
        { err: validated.error },
        "Mock /storereport request failed validation"
      );
      return HttpResponse.json(validated.error, { status: 500 });
    }

    const response: StoreReportResponse = {
      success: true,
      data: {
        uuid: validated.value.uuid,
      },
    };

    return HttpResponse.json(response);
  }
);

/**
 * Post request to store risk report address details. Stores UDPRN and Country Code
 */
const storeRiskReportAddressEndpoint = http.post(
  "*/lookup",
  async ({ request }) => {
    const validated = lookupAddressRequestSchema.validate(await request.json());

    if (validated.error) {
      logger.error(
        { err: validated.error },
        "Mock /lookup request failed validation"
      );
      return HttpResponse.json(validated.error, { status: 500 });
    }

    const { udprn, uuid } = validated.value;

    switch (udprn) {
      case undefined:
        return HttpResponse.json({}, { status: 500 });

      case "20765140": {
        const response: LookupResponse = {
          success: true,
          data: {
            uuid,
            found: false,
          },
        };
        return HttpResponse.json(response);
      }

      default: {
        const response: LookupResponse = {
          success: true,
          data: {
            uuid,
            found: true,
          },
        };
        return HttpResponse.json(response);
      }
    }
  }
);

export const rpsRiskReportBackendHandlers: RequestHandler[] = [
  storeRiskReportAddressEndpoint,
  storeReportDetailsEndpoint,
];
