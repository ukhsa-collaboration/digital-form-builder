import { Item } from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";
import { Address } from "src/server/services/addressLookupService";

export type AddressType = "reportAddress" | "deliveryAddress" | "measurementAddress";

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
    value: address.uprn,
  }));
};

/**
 * Formats the address object from the lookup api
 * @param address - an address object
 * @returns a single line comma-separated address
 */
export const formatAddress = (address: {
  address: string;
  postcode?: string;
}): string => {
  return address.postcode
    ? `${address.address}, ${address.postcode}`
    : address.address;
};

/**
 * Finds an address by UPRN
 * @param addresses - a list of addresses
 * @param uprn - the uprn
 * @returns an address or undefined
 */
export const resolveAddressByUprn = (
  addresses: Address[],
  uprn: Address["uprn"]
): Address | undefined => {
  return addresses.find((addr) => String(addr.uprn) === uprn);
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
export const findMatchingAddress = (
  addresses: Address[],
  building?: string,
  addressLine1?: string
): Address | undefined => {
  const normalizedBuilding = building?.trim().toUpperCase();
  const addressLine1Pattern = addressLine1
    ? new RegExp(`^${addressLine1.trim().toUpperCase()}( |,)`)
    : null;

  for (const address of addresses) {
    const firstPart = address.address.split(",")[0].trim().toUpperCase();

    if (normalizedBuilding) {
      if (
        firstPart.replace(/\s/g, "") ===
          normalizedBuilding.replace(/\s/g, "") ||
        firstPart.startsWith(normalizedBuilding + " ")
      ) {
        return address;
      }
    }

    if (
      addressLine1Pattern &&
      addressLine1Pattern.test(address.address.toUpperCase())
    ) {
      return address;
    }
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
