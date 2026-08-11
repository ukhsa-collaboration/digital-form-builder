import { http, HttpResponse } from "msw";
import joi from "joi";
import pino from "pino";

const logger = pino().child({ name: "gtkBackend" });

const personDetailsSchema = joi.object({
  title: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi.string().required(),
  telephone: joi.string().required(),
});

const addressDetailsSchema = joi.object({
  udprn: joi.string().allow("").required(),
  fullAddress: joi.string().allow("").optional(),
  addressLine1: joi.string().allow("").optional(),
  addressLine2: joi.string().allow("").optional(),
  townCity: joi.string().allow("").optional(),
  country: joi.string().allow("").optional(),
  postcode: joi.string().allow("").optional(),
});

export const storeGtkRequestSchema = joi.object({
  uuid: joi.string().required(),
  orderNumber: joi.string().required(),
  customer: personDetailsSchema.required(),
  measurementAddress: addressDetailsSchema.required(),
  kitRecipient: personDetailsSchema.required(),
  kitRecipientAddress: addressDetailsSchema.required(),
  resultsRecipient: personDetailsSchema.required(),
  resultsRecipientAddress: addressDetailsSchema.required(),
  prevTestedAddress: joi.boolean().required(),
  prevAboveActionLevel: joi.boolean().required(),
  remediationComplete: joi.boolean().required(),
});

/**
 * Post request to store a gas test kit order, matching gas-test-kit-api-spec.json's
 * POST /storegtk.
 */
export const storeGtkEndpoint = http.post("*/storegtk", async ({ request }) => {
  const validated = storeGtkRequestSchema.validate(await request.json());

  if (validated.error) {
    logger.error(
      { err: validated.error },
      "Mock /storegtk request failed validation"
    );

    return HttpResponse.json(validated.error, { status: 500 });
  }

  return HttpResponse.json({});
});

export const rpsGasTestKitBackendHandlers = [storeGtkEndpoint];
