import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test } = lab;

import {
  deriveSelectedFieldName,
  resolveAddressByUdprn,
  findMatchingAddress,
  cleanAddresses,
} from "../addressUtils";
import { Address } from "server/services/addressLookupService";

const buildAddress = (overrides: Partial<Address> = {}): Address => ({
  address: "1 Test Street, London",
  postcode: "SW1A 1AA",
  udprn: "20764756",
  uprn: "185788542",
  countryCode: "E",
  ...overrides,
});

suite("addressUtils", () => {
  suite("deriveSelectedFieldName", () => {
    test("returns selectedReportAddress for reportAddress", () => {
      expect(deriveSelectedFieldName("reportAddress")).to.equal(
        "selectedReportAddress"
      );
    });

    test("returns selectedDeliveryAddress for deliveryAddress", () => {
      expect(deriveSelectedFieldName("deliveryAddress")).to.equal(
        "selectedDeliveryAddress"
      );
    });
  });

  suite("resolveAddressByUdprn", () => {
    const addresses = [
      buildAddress({ udprn: "111" }),
      buildAddress({ udprn: "222" }),
    ];

    test("returns the matching address", () => {
      expect(resolveAddressByUdprn(addresses, "222")).to.equal(addresses[1]);
    });

    test("returns undefined when no address matches", () => {
      expect(resolveAddressByUdprn(addresses, "999")).to.equal(undefined);
    });
  });

  suite("findMatchingAddress", () => {
    const addresses = [
      buildAddress({ address: "Flat 1, 2 Test Street, London" }),
      buildAddress({ address: "12 Test Street, London" }),
    ];

    test("matches on building name/number", () => {
      expect(findMatchingAddress(addresses, "12", undefined)).to.equal(
        addresses[1]
      );
    });

    test("matches on address line 1", () => {
      expect(
        findMatchingAddress(addresses, undefined, "12 Test Street")
      ).to.equal(addresses[1]);
    });

    test("returns undefined when nothing matches", () => {
      expect(findMatchingAddress(addresses, "999", "Nowhere Street")).to.equal(
        undefined
      );
    });
  });

  suite("cleanAddresses", () => {
    test("removes the comma directly after a leading street number", () => {
      const addresses = [buildAddress({ address: "12A, Test Street" })];
      expect(cleanAddresses(addresses)[0].address).to.equal("12A Test Street");
    });
  });
});
