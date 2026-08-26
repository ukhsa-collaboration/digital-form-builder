import joi from "joi";

export const lookupAddressRequestSchema = joi.object({
  sessionId: joi.string().uuid().required(),
  uprn: joi.string().required(),
  udprn: joi.string().required(),
});

export type RiskReportLookupAddressRequest = {
  sessionId: string;
  uprn: string;
  udprn: string;
};

export type RiskReportLookupResponse = {
  requestId: string;
  success: boolean;
  UDPRN: string;
  TemplateId?: string;
  found: boolean;
};

export const storeReportRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  deliveryMethod: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  telephone: joi.string().optional(),
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

export type StoreReportRequest = {
  uuid: string;
  deliveryMethod: string;
  firstName: string;
  lastName: string;
  telephone: string;
  email?: string;
  fullAddress?: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  postcode?: string;
  countryCode: string;
};

export type StoreReportResponse = {
  message: string;
  uuid: string;
};

export const storePaymentDetailsRequestSchema = joi.object({
  uuid: joi.string().required(),
  transactionId: joi.string().required(),
  settle_status: joi.string().valid("SETTLED", "NOT_SETTLED"),
});

export type StorePaymentDetailsResponse = {
  uuid: string;
  transactionId: string;
  message: string;
};
