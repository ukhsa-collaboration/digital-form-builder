import { http, HttpResponse } from "msw";
import joi from "joi";
import pino from "pino";

const logger = pino().child({ name: "rpsRiskReportBackend" });

export const lookupAddressRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  uprn: joi.string().required(),
  udprn: joi.string().required(),
});

export interface RiskReportLookupResponse {
  requestId: string;
  success: boolean;
  UDPRN: string;
  TemplateId?: string;
  found: boolean;
}

export const storeReportRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .optional(),
  fullAddress: joi.string().optional(),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().optional(),
  townCity: joi.string().optional(),
  postcode: joi.string().optional(),
  countryCode: joi.string().valid("N", "E", "S", "W").required(),
});

export type StoreReportAddressRequest = {
  uuid: string;
  udprn: string;
  uprn: string;
  countryCode: "E" | "W" | "N" | "S";
};

export type StoreReportDetailsRequest =
  | {
      deliveryMethod: "post";
      uuid: string;
      firstName: string;
      lastName: string;
      email?: string;

      /* Postal address details */
      address?: string;

      addressLine1?: string;
      addressLine2?: string;
      country?: string;
      townCity?: string;
      postcode?: string;
    }
  | {
      deliveryMethod: "email";
      uuid: string;
      firstName: string;
      lastName: string;
      email: string;
    };

export interface StoreReportResponse {
  message: string;
  uuid: string;
}

export const storePaymentDetailsRequestSchema = joi.object({
  uuid: joi.string().required(),
  transactionId: joi.string().required(),
  settle_status: joi.string().valid("SETTLED", "NOT_SETTLED"),
});

export interface StorePaymentDetailsResponse {
  uuid: string;
  transactionId: string;
  message: string;
}

/**
 * Post request to store customer details & delivery address (if delivery method is `Post`).
 */
export const storeReportDetailsEndpoint = http.post(
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
export const storeRiskReportAddressEndpoint = http.post(
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

      case "20765140":
        return HttpResponse.json({
          success: false,
          UDPRN: udprn,
          TemplateId: "1",
          found: false,
          requestId: sessionId,
        });

      default:
        return HttpResponse.json({
          success: true,
          UDPRN: udprn,
          TemplateId: "5",
          found: true,
          requestId: sessionId,
        });
    }
  }
);

export const storePaymentDetailsEndpoint = http.post(
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

    return HttpResponse.json({
      message: "Payment stored",
      uuid,
      transactionId,
    });
  }
);

export const rpsRiskReportBackendHandlers = [
  storeRiskReportAddressEndpoint,
  storeReportDetailsEndpoint,
  storePaymentDetailsEndpoint,
];
