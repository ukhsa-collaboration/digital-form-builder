import { Item } from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";
import { Address } from "src/server/services/addressLookupService";

// An address type is any identifier-safe string declared in the form JSON. It
// is used as a prefix for the namespaced state keys (e.g. `reportAddress_*`),
// so the controllers are agnostic to the specific value.
export type AddressType = string;

// The address type is used to build state-key prefixes and the derived
// selected-address field name, so keep it to identifier-safe characters.
export const addressTypeSchema = Joi.string()
  .pattern(/^[a-zA-Z][a-zA-Z0-9]*$/)
  .max(64);

/**
 * Returns the selected address radios field name for a given address type.
 * State keys are namespaced by address type, so the field name is derived by
 * pure string construction and works for any type without a lookup table.
 * @param addressType - the address type
 * @returns the component name of the selected address radios field
 */
export function deriveSelectedFieldName(addressType: AddressType): string {
  return `${addressType}_addressSelection`;
}

/**
 * Suffixes of the namespaced address state keys that should be exposed to the
 * template context so any component can display a previously selected address
 * (e.g. `{{ propertyAddress_selectedAddress.address }}`).
 *
 * `_addresses` (the full candidate list) is deliberately excluded: nothing in
 * templates needs it and it would bloat every page render.
 */
export const ADDRESS_CONTEXT_SUFFIXES = [
  "_selectedAddress",
  "_matchedAddress",
  "_postcodeLookup",
  "_buildingLookup",
  "_addressLine1Lookup",
  "_numberOfAddresses",
  "_hasMatchedAddress",
  "_isCorrectAddress",
];

const SELECTED_ADDRESS_SUFFIX = "_selectedAddress";

/**
 * Resolves the full single-line address string for an address type, regardless
 * of whether the selected address is stored as the full object (post-confirm)
 * or as a bare UDPRN string (post-selection). Falls back to the matched address
 * and then the cached candidate list.
 * @param state - the full form cache state
 * @param addressType - the address-type prefix (e.g. `propertyAddress`)
 * @returns the full address line, or "" when nothing is selected
 */
function resolveFullSelectedAddress(
  state: Record<string, any>,
  addressType: string
): string {
  const value = state[`${addressType}${SELECTED_ADDRESS_SUFFIX}`];
  if (!value) return "";

  if (typeof value === "object" && value.address) return formatAddress(value);

  // value is a UDPRN string — resolve it to the full object.
  const matched = state[`${addressType}_matchedAddress`];
  if (matched && String(matched.udprn) === String(value)) {
    return formatAddress(matched);
  }

  const addresses: Address[] = state[`${addressType}_addresses`] || [];
  const found = addresses.find((addr) => String(addr.udprn) === String(value));
  return found ? formatAddress(found) : String(value);
}

/**
 * Shallow-picks the namespaced address keys from cache state so they can be
 * merged into the nunjucks `formData` context. Object values (the selected /
 * matched address objects) are kept verbatim. For every `${type}_selectedAddress`
 * key it also adds a resolved `${type}_fullSelectedAddress` string containing the
 * full single-line address, so templates can display it without having to know
 * whether the selection is stored as an object or a UDPRN.
 * @param state - the full form cache state
 * @returns a map of address state keys to their values
 */
export function extractAddressContext(
  state: Record<string, any>
): Record<string, any> {
  const context: Record<string, any> = {};

  if (!state) return context;

  for (const key of Object.keys(state)) {
    if (ADDRESS_CONTEXT_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
      context[key] = state[key];
    }

    if (key.endsWith(SELECTED_ADDRESS_SUFFIX)) {
      const addressType = key.slice(0, -SELECTED_ADDRESS_SUFFIX.length);
      context[
        `${addressType}_fullSelectedAddress`
      ] = resolveFullSelectedAddress(state, addressType);
    }
  }

  return context;
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
