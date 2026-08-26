import { http, HttpResponse, RequestHandler } from "msw";
import { createChildLogger } from "../../utils/logger";
import {
  lookupAddressRequestSchema,
  RiskReportLookupResponse,
  storePaymentDetailsRequestSchema,
  StorePaymentDetailsResponse,
  storeReportRequestSchema,
  StoreReportResponse,
} from "@xgovformbuilder/model/dist/module/schema/rps";

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
      message: "",
      uuid: validated.value.uuid,
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

    const { udprn, sessionId } = validated.value;

    switch (udprn) {
      case undefined:
        return HttpResponse.json({}, { status: 500 });

      case "20765140": {
        const response: RiskReportLookupResponse = {
          success: false,
          UDPRN: udprn,
          TemplateId: "1",
          found: false,
          requestId: sessionId,
        };
        return HttpResponse.json(response);
      }

      default: {
        const response: RiskReportLookupResponse = {
          success: true,
          UDPRN: udprn,
          TemplateId: "5",
          found: true,
          requestId: sessionId,
        };
        return HttpResponse.json(response);
      }
    }
  }
);

const storePaymentDetailsEndpoint = http.post(
  "*/storepayment",
  async ({ request }) => {
    const validated = storePaymentDetailsRequestSchema.validate(
      await request.json()
    );

    if (validated.error) {
      logger.error(
        { err: validated.error },
        "Mock /storepayment request failed validation"
      );
      return HttpResponse.json(validated.error, { status: 500 });
    }

    const { uuid, transactionId } = validated.value;

    const response: StorePaymentDetailsResponse = {
      message: "Payment stored",
      uuid,
      transactionId,
    };
    return HttpResponse.json(response);
  }
);

export const rpsRiskReportBackendHandlers: RequestHandler[] = [
  storeRiskReportAddressEndpoint,
  storeReportDetailsEndpoint,
  storePaymentDetailsEndpoint,
];
