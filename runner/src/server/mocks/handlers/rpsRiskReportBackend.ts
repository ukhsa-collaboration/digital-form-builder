import { http, HttpResponse } from "msw";
import joi from "joi";
import pino from "pino";

const logger = pino().child({ name: "rpsRiskReportBackend" });

export const lookupAddressRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  uprn: joi.string().required(),
  udprn: joi.string().required(),
  countryCode: joi.string().valid("N", "E", "S", "W").required(),
});

export interface RiskReportLookupResponse {
  success: boolean;
  UDPRN: string;
  TemplateId?: string;
  found: boolean;
  requestId: string;
}

export const storeReportRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required(),
  country: joi.string().required(),
  addressLine1: joi.string().required(),
  addressLine2: joi.string().optional(),
  townCity: joi.string().required(),
  postcode: joi.string().required(),
  BuildingRegs: joi.string().required(),
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

export const rpsRiskReportBackendHandlers = [
  storeRiskReportAddressEndpoint,
  storeReportDetailsEndpoint,
];
