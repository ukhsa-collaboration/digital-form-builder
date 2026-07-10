import { PageControllerBase } from "./PageControllerBase";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import {
  Address,
  AddressLookupService,
} from "../../../services/addressLookupService";
import { getLocationServiceInstanceName } from "../helpers";
import { Item } from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";

const findMatchingAddress = (
  addresses: any[],
  building?: string,
  addressLine1?: string
): any | null => {
  if (building) {
    const normalized = building.trim().toUpperCase();
    const match = addresses.find((address: any) => {
      const firstPart = address.address.split(",")[0].trim().toUpperCase();
      return (
        firstPart.replace(/\s/g, "") === normalized.replace(/\s/g, "") ||
        firstPart.startsWith(normalized + " ")
      );
    });
    if (match) return match;
  }

  if (addressLine1) {
    const pattern = new RegExp(`^${addressLine1.trim().toUpperCase()}( |,)`);
    return (
      addresses.find((address: any) =>
        pattern.test(address.address.toUpperCase())
      ) ?? null
    );
  }

  return null;
};

const cleanAddresses = (addresses: any[]): any[] => {
  const streetNumberPattern = /(^|, )(\d+[A-Z]?([-\/]\d+)?[A-Z]?),/i;
  return addresses.map((address) => ({
    ...address,
    address: address.address.replace(streetNumberPattern, "$1$2"),
  }));
};

const addressesToList = (addresses: Address[]): Item[] => {
  return addresses.map((address) => ({
    text: address.address,
    value: address.uprn,
  }));
};

const formSchema = Joi.object({
  addressType: Joi.string().valid("reportAddress", "deliveryAddress"),
}).unknown(true);

type FormSubmission = {
  addressType: "reportAddress" | "deliveryAddress";
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
        console.log(
          "validation errors:",
          JSON.stringify(validation.errors, null, 2)
        );
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
        console.log("No config for address lookup error");
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

      console.log("savedState:", JSON.stringify(savedState, null, 2));

      // Navigate to the next page
      return this.proceed(request, h, { ...savedState });
    };
  }
}
