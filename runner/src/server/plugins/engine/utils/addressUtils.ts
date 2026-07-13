import { Item } from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";

export type AddressType = "reportAddress" | "deliveryAddress";

export type SelectedFieldName =
  | "selectedReportAddress"
  | "selectedDeliveryAddress";

export const addressTypeSchema = Joi.string().valid(
  "reportAddress",
  "deliveryAddress"
);

export function deriveSelectedFieldName(
  addressType: AddressType
): SelectedFieldName {
  return addressType === "deliveryAddress"
    ? "selectedDeliveryAddress"
    : "selectedReportAddress";
}

export const addressesToList = (addresses: Address[]): Item[] => {
  return addresses.map((address) => ({
    text: address.address,
    value: address.uprn,
  }));
};

export const formatAddress = (addr: {
  address: string;
  postcode?: string;
}): string => {
  return addr.postcode ? `${addr.address}, ${addr.postcode}` : addr.address;
};

export const resolveAddressByUprn = (
  addresses: any[],
  uprn: unknown
): any | null => {
  return addresses.find((addr) => String(addr.uprn) === String(uprn)) ?? null;
};

const STREET_NUMBER_PATTERN = /(^|, )(\d+[A-Z]?([-\/]\d+)?[A-Z]?),/i;

export const findMatchingAddress = (
  addresses: any[],
  building?: string,
  addressLine1?: string
): any | null => {
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

  return null;
};

export const cleanAddresses = (addresses: any[]): any[] => {
  return addresses.map((address) => ({
    ...address,
    address: address.address.replace(STREET_NUMBER_PATTERN, "$1$2"),
  }));
};
