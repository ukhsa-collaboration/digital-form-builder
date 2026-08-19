import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { saveGasTestKitDetailsSchema } from "../../../../../src/server/services/hooks/rps/saveGasTestKitDetailsSchema";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it } = lab;

describe("saveGasTestKitDetailsSchema", () => {
  const person = {
    title: "Mr",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
  };

  const address = {
    udprn: "23747208",
    fullAddress: "Houses of Parliament, Westminster, London, SW1A 0AA",
    postcode: "SW1A 0AA",
  };

  const manualAddress = {
    udprn: "",
    fullAddress: "1 Test Street, Testville, TE5 7ST",
    postcode: "TE5 7ST",
  };

  const basePayload = {
    uuid: "343d10da-7d57-425e-8b2f-6891b1c563d6",
    orderNumber: "RRR-26154780",
    customer: person,
    measurementAddress: address,
    kitRecipient: person,
    kitRecipientAddress: address,
    resultsRecipient: person,
    resultsRecipientAddress: manualAddress,
    prevTestedAddress: false,
    prevAboveActionLevel: false,
    remediationComplete: false,
  };

  describe("valid payloads", () => {
    it("accepts a fully populated payload", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate(
        basePayload
      );
      expect(error).to.be.undefined();
      expect(value.customer.telephone).to.equal("dummy-telephone");
      expect(value.resultsRecipientAddress.udprn).to.equal("");
    });

    it("strips unknown top-level fields", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        somethingUnexpected: "leftover state",
      });
      expect(error).to.be.undefined();
      expect(value).to.not.include("somethingUnexpected");
    });

    it("keeps an explicitly provided telephone", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        customer: { ...person, telephone: "07865123456" },
      });
      expect(error).to.be.undefined();
      expect(value.customer.telephone).to.equal("07865123456");
    });
  });

  describe("invalid payloads", () => {
    it("errors when uuid is missing", () => {
      const { uuid, ...rest } = basePayload;
      const { error } = saveGasTestKitDetailsSchema.validate(rest);
      expect(error).to.exist();
      expect(error!.message).to.include("uuid");
    });

    it("errors when customer.firstName is missing", () => {
      const { firstName, ...personWithoutFirstName } = person;
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        customer: personWithoutFirstName,
      });
      expect(error).to.exist();
      expect(error!.message).to.include("firstName");
    });

    it("errors when an address is missing udprn", () => {
      const { udprn, ...addressWithoutUdprn } = address;
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        measurementAddress: addressWithoutUdprn,
      });
      expect(error).to.exist();
      expect(error!.message).to.include("udprn");
    });

    it("errors when prevTestedAddress is not a boolean", () => {
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        prevTestedAddress: "yes",
      });
      expect(error).to.exist();
      expect(error!.message).to.include("prevTestedAddress");
    });
  });
});
