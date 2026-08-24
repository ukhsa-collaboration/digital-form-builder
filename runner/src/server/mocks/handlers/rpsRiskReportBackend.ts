import { http, HttpResponse, RequestHandler } from "msw";
import joi from "joi";
import { createChildLogger } from "../../utils/logger";

const logger = createChildLogger({ name: "rpsRiskReportBackend" });

const lookupAddressRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  udprn: joi.string().required(),
  countryCode: joi.string().valid("N", "E", "S", "W").required(),
});

interface RiskReportLookupResponse {
  requestId: string;
  found: boolean;
}

const storeReportRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  deliveryMethod: joi.string().valid("email", "post").required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .optional()
    .allow(""),
  telephone: joi.string().optional().allow(""),
  udprn: joi.string().allow("").optional(),
  fullAddress: joi.string().optional(),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().optional(),
  townCity: joi.string().optional(),
  postcode: joi.string().optional(),
});

interface StoreReportResponse {
  success: boolean;
  uuid: string;
}

const storePaymentDetailsRequestSchema = joi.object({
  uuid: joi.string().required(),
  transactionId: joi.string().required(),
  settle_status: joi.string().valid("SETTLED", "NOT_SETTLED"),
});

interface StorePaymentDetailsResponse {
  uuid: string;
  transactionId: string;
  message: string;
}

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

    const { udprn, uuid } = validated.value;

    switch (udprn) {
      case undefined:
        return HttpResponse.json({}, { status: 500 });

      case "20765140": {
        const response: RiskReportLookupResponse = {
          found: false,
          requestId: uuid,
        };
        return HttpResponse.json(response);
      }

      default: {
        const response: RiskReportLookupResponse = {
          found: true,
          requestId: uuid,
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
