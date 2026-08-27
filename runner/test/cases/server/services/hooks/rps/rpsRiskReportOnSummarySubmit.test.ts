import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { storeReportRequestSchema } from "@xgovformbuilder/model/src/schema/rps";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it } = lab;

describe("storeReportRequestSchema", () => {
  const basePostState = {
    uuid: "00000000-0000-0000-0000-000000000001",
    firstName: "John",
    lastName: "Doe",
    deliveryMethod: "post",
    telephone: "07700900000",
    fullAddress: "10 Downing Street, London, SW1A 2AA",
    countryCode: "E",
  };

  const baseEmailState = {
    uuid: "00000000-0000-0000-0000-000000000002",
    firstName: "Jane",
    lastName: "Doe",
    deliveryMethod: "email",
    telephone: "07700900000",
    email: "jane.doe@example.com",
    fullAddress: "10 Downing Street, London, SW1A 2AA",
    countryCode: "E",
  };

  describe("valid payloads", () => {
    it("validates a post delivery without email", () => {
      const { error } = storeReportRequestSchema.validate(basePostState);
      expect(error).to.be.undefined();
    });

    it("validates a post delivery with optional email included", () => {
      const state = { ...basePostState, email: "john.doe@example.com" };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.be.undefined();
    });

    it("validates an email delivery with required email", () => {
      const { error } = storeReportRequestSchema.validate(baseEmailState);
      expect(error).to.be.undefined();
    });
  });

  describe("invalid payloads", () => {
    it("errors when firstName is missing", () => {
      const state = { ...basePostState, firstName: undefined };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("firstName");
    });

    it("errors when lastName is missing", () => {
      const state = { ...basePostState, lastName: undefined };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("lastName");
    });

    it("errors when uuid is missing", () => {
      const state = { ...basePostState, uuid: undefined };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("uuid");
    });

    it("errors when deliveryMethod is email and email is missing", () => {
      const state = { ...baseEmailState, email: undefined };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("email");
    });

    it("errors when deliveryMethod is not a valid value", () => {
      const state = { ...basePostState, deliveryMethod: "carrier-pigeon" };
      const { error } = storeReportRequestSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("deliveryMethod");
    });
  });
});
