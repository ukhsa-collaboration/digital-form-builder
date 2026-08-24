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

export const extractInputFromSubmission = (data: FormSubmission) => {
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

export const buildManualSelectedAddress = ({
  addressLine1,
  addressLine2,
  town,
  county,
  postcode,
}: Omit<ReturnType<typeof extractInputFromSubmission>, "addressType">) => ({
  address: [addressLine1, addressLine2, town, county, postcode]
    .filter((part) => part)
    .join(", "),
  postcode,
  udprn: "",
  uprn: "00000000",
  countryCode: "",
  addressLine1,
  addressLine2,
  townCity: town,
});

/**
 * Handles pages that collect an address purely by manual text entry — no
 * postcode lookup, no "select an address" step. It stores the entered
 * address as `${addressType}_selectedAddress`, using the same shape
 * (`{ address, postcode, udprn, uprn, countryCode, addressLine1, addressLine2, townCity }`)
 * that `SelectAnAddressPageController` stores for a looked-up address, so
 * templates and the submit action can read either kind of address
 * identically. `udprn`/`uprn`/`countryCode` are empty strings since no
 * lookup ever took place. Unlike a looked-up address, the individual
 * address lines and town/city are known here (the user typed them
 * separately), so they're preserved rather than only folded into the
 * concatenated `address` string.
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

      const { addressType, ...extracted } = extractInputFromSubmission(
        validation.value
      );

      const { cacheService } = request.services([]);

      const savedState = await cacheService.mergeState(request, {
        [`${addressType}_selectedAddress`]: buildManualSelectedAddress(
          extracted
        ),
      });

      return this.proceed(request, h, savedState);
    };
  }
}
