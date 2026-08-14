import { Item } from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";
import { Address } from "src/server/services/addressLookupService";
import Fuse from "fuse.js";

export type AddressType =
  | "reportAddress"
  | "deliveryAddress"
  | "measurementAddress";

export type SelectedFieldName =
  | "selectedReportAddress"
  | "selectedDeliveryAddress";

export type AddressLookupFields = {
  postcode: string;
  building?: string;
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
};

export const addressTypeSchema = Joi.string().valid(
  "reportAddress",
  "deliveryAddress",
  "measurementAddress"
);

/**
 * Returns the selected address name using the address type
 * @param addressType - the adders type
 * @returns the component name of the selected address
 */
export function deriveSelectedFieldName(
  addressType: AddressType
): SelectedFieldName {
  switch (addressType) {
    case "reportAddress":
      return "selectedReportAddress";
    case "deliveryAddress":
      return "selectedDeliveryAddress";
    default:
      return addressType as never;
  }
}

/**
 * Converts an array of addresses to a template list
 * @param addresses - a list of addresses
 * @returns the address list template
 */
export const addressesToList = (addresses: Address[]): Item[] => {
  return addresses.map((address) => ({
    text: address.address,
    value: address.udprn,
  }));
};

/**
 * Finds an address by UDPRN
 * @param addresses - a list of addresses
 * @param udprn - the udprn
 * @returns an address or undefined
 */
export const resolveAddressByUdprn = (
  addresses: Address[],
  udprn: Address["udprn"]
): Address | undefined => {
  return addresses.find((addr) => String(addr.udprn) === udprn);
};

const STREET_NUMBER_PATTERN = /(^|, )(\d+[A-Z]?([-\/]\d+)?[A-Z]?),/i;

/**
 * Finds the correct address using building name, number or 1st line of address
 *
 * @param addresses - a list of addresses
 * @param building - the building name
 * @param addressLine1 - the 1st line of the address
 * @param addressLine2 - the 2nd line of the address
 * @param town - the town of the address
 * @param county - the county of the address
 * @returns an address or undefined
 */

export const findMatchingAddress = (
  addresses: Address[],
  address: AddressLookupFields
): Address | undefined => {
  const addressQuery = [
    address.building,
    address.addressLine1,
    address.addressLine2,
    address.town,
    address.county,
  ]
    .filter(Boolean)
    .map((part) => part?.trim().toUpperCase())
    .join(", ");
  return fuzzyMatchAddress(addresses, addressQuery);
};

export const fuzzyMatchAddress = (
  addresses: Address[],
  query: string
): Address | undefined => {
  const fuse = new Fuse(addresses, {
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    keys: ["address"],
  });

  const results = fuse.search(query);
  // Return the best match
  if (results.length > 0 && results[0].score < 0.38) {
    return results[0].item;
  }

  return undefined;
};

/**
 * Cleans the address street number
 * @param addresses - a list of addresses
 * @returns a transformed address
 */
export const cleanAddresses = (addresses: Address[]): Address[] => {
  return addresses.map((address) => ({
    ...address,
    address: address.address.replace(STREET_NUMBER_PATTERN, "$1$2"),
  }));
};
