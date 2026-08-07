import { PageControllerBase } from "./PageControllerBase";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import Joi from "joi";
import { addressTypeSchema, AddressType } from "../utils/addressUtils";

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
    addressLine1: rest[`${addressType}_addressLine1Lookup`],
    addressLine2: rest[`${addressType}_addressLine2Lookup`],
    town: rest[`${addressType}_townLookup`],
    county: rest[`${addressType}_countyLookup`],
    postcode: rest[`${addressType}_postcodeLookup`],
  };
};

/**
 * Handles pages that collect an address purely by manual text entry — no
 * postcode lookup, no "select an address" step. It stores the entered
 * address as `${addressType}_selectedAddress`, using the same shape
 * (`{ address, postcode, udprn, uprn, countryCode }`) that
 * `SelectAnAddressPageController` stores for a looked-up address, so
 * templates and the submit action can read either kind of address
 * identically. `udprn`/`uprn`/`countryCode` are empty strings since no
 * lookup ever took place.
 */
export class ManualAddressPageController extends PageControllerBase {
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
        addressLine1,
        addressLine2,
        town,
        county,
        postcode,
      } = extractInputFromSubmission(validation.value);

      const address = [addressLine1, addressLine2, town, county, postcode]
        .filter((part) => part)
        .join(", ");

      const { cacheService } = request.services([]);

      const savedState = await cacheService.mergeState(request, {
        [`${addressType}_selectedAddress`]: {
          address,
          postcode,
          udprn: "",
          uprn: "00000000",
          countryCode: "",
        },
      });

      return this.proceed(request, h, savedState, false);
    };
  }
}
