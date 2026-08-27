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
  deliveryMethod: joi.string().valid("email", "post").required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  telephone: joi.string().required(),
  email: joi.when("deliveryMethod", {
    is: "email",
    then: joi
      .string()
      .email({ tlds: { allow: false } })
      .required(),
    otherwise: joi
      .string()
      .email({ tlds: { allow: false } })
      .optional(),
  }),
  fullAddress: joi.string().required(),
  countryCode: joi.string().valid("N", "E", "S", "W").required(),
});

type StoreReportRequestBase = {
  uuid: string;
  firstName: string;
  lastName: string;
  telephone: string;
  fullAddress: string;
  countryCode: string;
};

export type StoreReportRequest =
  | (StoreReportRequestBase & { deliveryMethod: "email"; email: string })
  | (StoreReportRequestBase & { deliveryMethod: "post"; email?: string });

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
