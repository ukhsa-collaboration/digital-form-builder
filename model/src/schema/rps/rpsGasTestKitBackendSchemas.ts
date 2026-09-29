import joi from "joi";
import { RpsApiResponse } from "./types";

const customerDetailsSchema = joi.object({
  title: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required(),
  telephone: joi.string().optional(),
});

type PersonDetails = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
};

const addressRecipientSchema = joi.object({
  title: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
});

export type AddressRecipient = {
  title: string;
  firstName: string;
  lastName: string;
};

const addressDetailsSchema = joi.object({
  fullAddress: joi.string().required(),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().allow("").optional(),
  townCity: joi.string().allow("").optional(),
  country: joi.string().allow("").optional(),
  postcode: joi.string().optional(),
});

type AddressDetails = {
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
    customer: customerDetailsSchema.required(),
    measurementAddress: addressDetailsSchema.required(),
    kitRecipient: addressRecipientSchema.required(),
    kitRecipientAddress: addressDetailsSchema.required(),
    resultsRecipient: addressRecipientSchema.required(),
    resultsRecipientAddress: addressDetailsSchema.required(),
    prevTestedAddress: joi.boolean().required(),
    prevAboveActionLevel: joi.boolean().required(),
    remediationComplete: joi.boolean().required(),
    amount: joi.number().integer().required(),
  })
  .options({ stripUnknown: true });

export type StoreGtkData = {
  uuid: string;
  customer: PersonDetails;
  measurementAddress: AddressDetails;
  kitRecipient: AddressRecipient;
  kitRecipientAddress: AddressDetails;
  resultsRecipient: AddressRecipient;
  resultsRecipientAddress: AddressDetails;
  prevTestedAddress: boolean;
  prevAboveActionLevel: boolean;
  remediationComplete: boolean;
  amount: number;
};

export type StoreGtkResponse = RpsApiResponse<{
  uuid: string;
  message: string;
}>;
