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
 * @returns an address or undefined
 */

export const getAddressQuery = (
  addressLine1: string,
  town: string,
  addressLine2?: string,
  county?: string
): string => {
  const addressParts = [addressLine1, addressLine2, town, county];
  return addressParts.filter((part) => part && part.trim() !== "").join(", ");
};

export const findMatchingAddress = (
  addresses: Address[],
  building?: string,
  addressLine1?: string,
  addressLine2?: string,
  town?: string,
  county?: string
): Address | undefined => {
  const normalizedBuilding = building?.trim().toUpperCase();
  const normalizedAddressLine1 = addressLine1?.trim().toUpperCase();
  const normalizedAddressLine2 = addressLine2?.trim().toUpperCase();
  const normalizedTown = town?.trim().toUpperCase();
  const normalizedCounty = county?.trim().toUpperCase();

  let addressSearch;
  if (normalizedAddressLine1 && normalizedTown) {
    addressSearch = getAddressQuery(
      normalizedAddressLine1,
      normalizedTown,
      normalizedAddressLine2,
      normalizedCounty
    );
  } else if (normalizedBuilding) {
    addressSearch = normalizedBuilding;
  }

  // Default 0.6 tolerance
  const fuse = new Fuse(addresses, {
    includeScore: true,
    includeMatches: true,
    useTokenSearch: true,
    keys: ["address"],
  });

  const results = fuse.search(addressSearch);
  // Return the first match
  if (results.length > 0) {
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
