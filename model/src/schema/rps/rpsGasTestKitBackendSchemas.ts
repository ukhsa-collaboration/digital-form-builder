import joi from "joi";

const personalDetailsSchema = joi.object({
  title: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required(),
  // still not finalised, so we have a dummy placeholder for telephone
  telephone: joi.string().default("dummy-telephone"),
});

type PersonDetails = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
};

const addressDetailsSchema = joi.object({
  udprn: joi.string().required(),
  fullAddress: joi.string().required(),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().allow("").optional(),
  townCity: joi.string().allow("").optional(),
  country: joi.string().allow("").optional(),
  postcode: joi.string().optional(),
});

type AddressDetails = {
  udprn: string;
  fullAddress: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  country?: string;
  postcode?: string;
};

export const saveGasTestKitDetailsSchema = joi
  .object({
    uuid: joi.string().required(),
    orderNumber: joi.string().required(),
    customer: personalDetailsSchema.required(),
    measurementAddress: addressDetailsSchema.required(),
    kitRecipient: personalDetailsSchema.required(),
    kitRecipientAddress: addressDetailsSchema.required(),
    resultsRecipient: personalDetailsSchema.required(),
    resultsRecipientAddress: addressDetailsSchema.required(),
    prevTestedAddress: joi.boolean().required(),
    prevAboveActionLevel: joi.boolean().required(),
    remediationComplete: joi.boolean().required(),
  })
  .options({ stripUnknown: true });

export type StoreGtkRequest = {
  uuid: string;
  orderNumber: string;
  customer: PersonDetails;
  measurementAddress: AddressDetails;
  kitRecipient: PersonDetails;
  kitRecipientAddress: AddressDetails;
  resultsRecipient: PersonDetails;
  resultsRecipientAddress: AddressDetails;
  prevTestedAddress: boolean;
  prevAboveActionLevel: boolean;
  remediationComplete: boolean;
};
