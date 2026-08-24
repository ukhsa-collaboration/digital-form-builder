import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import {
  extractInputFromSubmission,
  buildManualSelectedAddress,
} from "server/plugins/engine/pageControllers/ManualAddressPageController";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it } = lab;

describe("ManualAddressPageController", () => {
  describe("extractInputFromSubmission", () => {
    it("reads the address-type-prefixed lookup fields", () => {
      const result = extractInputFromSubmission({
        addressType: "deliveryAddress",
        deliveryAddress_addressLine1Lookup: "10 Downing Street",
        deliveryAddress_addressLine2Lookup: "Westminster",
        deliveryAddress_townLookup: "London",
        deliveryAddress_countyLookup: "Greater London",
        deliveryAddress_postcodeLookup: "SW1A 2AA",
      } as any);

      expect(result).to.equal({
        addressType: "deliveryAddress",
        addressLine1: "10 Downing Street",
        addressLine2: "Westminster",
        town: "London",
        county: "Greater London",
        postcode: "SW1A 2AA",
      });
    });
  });

  describe("buildManualSelectedAddress", () => {
    it("preserves the individual address lines and town/city alongside the concatenated address", () => {
      const result = buildManualSelectedAddress({
        addressLine1: "10 Downing Street",
        addressLine2: "Westminster",
        town: "London",
        county: "Greater London",
        postcode: "SW1A 2AA",
      });

      expect(result).to.equal({
        address:
          "10 Downing Street, Westminster, London, Greater London, SW1A 2AA",
        postcode: "SW1A 2AA",
        udprn: "",
        uprn: "00000000",
        countryCode: "",
        addressLine1: "10 Downing Street",
        addressLine2: "Westminster",
        townCity: "London",
      });
    });

    it("omits blank parts from the concatenated address", () => {
      const result = buildManualSelectedAddress({
        addressLine1: "10 Downing Street",
        addressLine2: "",
        town: "London",
        county: "",
        postcode: "SW1A 2AA",
      });

      expect(result.address).to.equal("10 Downing Street, London, SW1A 2AA");
    });
  });
});
