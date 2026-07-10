import { PageControllerBase } from "./PageControllerBase";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { AddressLookupService } from "../../../services/addressLookupService";
import { getLocationServiceInstanceName } from "../helpers";
import Joi from "joi";
import {
  addressTypeSchema,
  addressesToList,
  AddressType,
} from "../utils/addressUtils";

const STREET_NUMBER_PATTERN = /(^|, )(\d+[A-Z]?([-\/]\d+)?[A-Z]?),/i;

const findMatchingAddress = (
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

const cleanAddresses = (addresses: any[]): any[] => {
  return addresses.map((address) => ({
    ...address,
    address: address.address.replace(STREET_NUMBER_PATTERN, "$1$2"),
  }));
};

const formSchema = Joi.object({
  addressType: addressTypeSchema,
}).unknown(true);

type FormSubmission = {
  addressType: AddressType;
  [x: string]: string;
};

const extractInputFromSubmission = (data: FormSubmission) => {
  const { addressType, ...rest } = data;

  return {
    addressType,
    postcodeLookup: rest[`${addressType}_postcodeLookup`],
    addressLine1Lookup: rest[`${addressType}_addressLine1Lookup`],
    buildingLookup: rest[`${addressType}_buildingLookup`],
  };
};

export class FindAnAddressPageController extends PageControllerBase {
  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const response = await this.handlePostRequest(request, h);

      const payload = (request.payload || {}) as FormData;

      const formResult = this.validateForm(payload);

      if (formResult.errors) {
        return response;
      }

      const validation = this.validate<FormSubmission>(payload, formSchema);

      if (validation.errors) {
        return response;
      }

      const {
        addressType,
        postcodeLookup,
        addressLine1Lookup,
        buildingLookup,
      } = extractInputFromSubmission(validation.value);

      const config = this.model.def?.addressLookupConfig;

      if (typeof config === "undefined") {
        return response;
      }

      const addressLookupInstanceName = getLocationServiceInstanceName(config);

      const { cacheService, ...rest } = request.services([]);

      const addressLookupService = rest[
        addressLookupInstanceName
      ] as AddressLookupService;

      if (!addressLookupService) {
        return response;
      }

      const addressResponse = await addressLookupService.lookupByPostcode(
        postcodeLookup
      );

      const addresses = cleanAddresses(addressResponse.addresses);

      const matchedAddress = findMatchingAddress(
        addresses,
        buildingLookup,
        addressLine1Lookup
      );

      const list = this.model.lists.find(
        (list) => list.name === "addressesList"
      );

      if (list) {
        list.items = addressesToList(addresses);
      }

      const savedState = await cacheService.mergeState(request, {
        // save inputs
        [`${addressType}_postcodeLookup`]: postcodeLookup,
        [`${addressType}_buildingLookup`]: buildingLookup,
        [`${addressType}_addressLine1Lookup`]: addressLine1Lookup,
        // save data
        [`${addressType}_addresses`]: addresses,
        [`${addressType}_numberOfAddresses`]: addresses.length,
        [`${addressType}_hasMatchedAddress`]: matchedAddress !== null,
        ...(matchedAddress && {
          [`${addressType}_matchedAddress`]: matchedAddress,
        }),
        [`${addressType}_isCorrectAddress`]: null,
      });

      // Navigate to the next page
      return this.proceed(request, h, { ...savedState });
    };
  }
}
