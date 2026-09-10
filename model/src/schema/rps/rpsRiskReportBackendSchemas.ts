import joi from "joi";
import { RpsApiResponse } from "./types";

export const lookupAddressRequestSchema = joi.object({
  uuid: joi.string().uuid({ version: "uuidv4" }).required(),
  udprn: joi.string().required(),
  countryCode: joi.string().valid("E", "W", "S", "N").required(),
  fullAddress: joi.string().required(),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().allow("").optional(),
  townCity: joi.string().allow("").optional(),
  postcode: joi.string().optional(),
});

export type LookupAddressData = {
  uuid: string;
  udprn: string;
  countryCode: "E" | "W" | "S" | "N";
  fullAddress: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  postcode?: string;
};

export type LookupResponse = RpsApiResponse<{ uuid: string; found: boolean }>;

export const storeReportRequestSchema = joi.object({
  uuid: joi.string().uuid().required(),
  deliveryMethod: joi.string().valid("email", "post").required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
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
  fullAddress: joi.when("deliveryMethod", {
    is: "post",
    then: joi.string().required(),
    otherwise: joi.string().optional(),
  }),
  addressLine1: joi.string().optional(),
  addressLine2: joi.string().allow("").optional(),
  townCity: joi.string().allow("").optional(),
  postcode: joi.string().optional(),
});

type StoreReportDataBase = {
  uuid: string;
  firstName: string;
  lastName: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  postcode?: string;
};

export type StoreReportData =
  | (StoreReportDataBase & {
      deliveryMethod: "email";
      email: string;
      fullAddress?: string;
    })
  | (StoreReportDataBase & {
      deliveryMethod: "post";
      fullAddress: string;
      email?: string;
    });

export type StoreReportResponse = RpsApiResponse<{ uuid: string }>;
