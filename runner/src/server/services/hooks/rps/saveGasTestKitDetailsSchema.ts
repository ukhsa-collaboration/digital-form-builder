import Joi from "joi";

// Matches `PersonalDetails` in gas-test-kit-api-spec.json. This form doesn't
// collect a phone number, so `telephone` defaults to a placeholder — the
// same approach `saveRiskReportDetailsSchema.ts` uses for the risk-report
// form, which doesn't collect one either.
const personalDetailsSchema = Joi.object({
  title: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  telephone: Joi.string().default("dummy-telephone"),
});

// Matches `AddressDetails` in gas-test-kit-api-spec.json. Only `udprn` is
// required by the spec; manually-entered addresses (no postcode lookup) have
// no UDPRN, so it's allowed to be an empty string.
const addressDetailsSchema = Joi.object({
  udprn: Joi.string().allow("").required(),
  fullAddress: Joi.string().allow("").optional(),
  addressLine1: Joi.string().allow("").optional(),
  addressLine2: Joi.string().allow("").optional(),
  townCity: Joi.string().allow("").optional(),
  country: Joi.string().allow("").optional(),
  postcode: Joi.string().allow("").optional(),
});

// Matches `StoreGTKRequest` in gas-test-kit-api-spec.json, the body posted
// to POST /storegtk.
export const saveGasTestKitDetailsSchema = Joi.object({
  uuid: Joi.string().required(),
  orderNumber: Joi.string().required(),
  customer: personalDetailsSchema.required(),
  measurementAddress: addressDetailsSchema.required(),
  kitRecipient: personalDetailsSchema.required(),
  kitRecipientAddress: addressDetailsSchema.required(),
  resultsRecipient: personalDetailsSchema.required(),
  resultsRecipientAddress: addressDetailsSchema.required(),
  prevTestedAddress: Joi.boolean().required(),
  prevAboveActionLevel: Joi.boolean().required(),
  remediationComplete: Joi.boolean().required(),
}).options({ stripUnknown: true });
