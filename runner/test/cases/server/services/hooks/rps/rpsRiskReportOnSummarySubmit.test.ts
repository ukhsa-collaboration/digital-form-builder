import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { saveRiskReportDetailsSchema } from "../../../../../../src/server/services/hooks/rps/rpsRiskReportOnSummarySubmit";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it } = lab;

describe("saveRiskReportDetailsSchema", () => {
  const basePostState = {
    uuid: "abc-123",
    firstName: "John",
    lastName: "Doe",
    deliveryMethod: "post",
    emailAddress: "",
    deliveryAddress_selectedAddress: "10 Downing Street, London, SW1A 2AA",
  };

  const baseEmailState = {
    uuid: "abc-123",
    firstName: "Jane",
    lastName: "Doe",
    deliveryMethod: "email",
    emailAddress: "jane.doe@example.com",
  };

  describe("valid payloads", () => {
    it("renames keys and strips unknown fields for a post delivery", () => {
      const { error, value } = saveRiskReportDetailsSchema.validate(
        basePostState
      );
      expect(error).to.be.undefined();
      expect(value).to.equal({
        uuid: "abc-123",
        firstName: "John",
        lastName: "Doe",
        deliveryMethod: "post",
        email: "",
        telephone: "dummy-telephone",
        fullAddress: "10 Downing Street, London, SW1A 2AA",
      });
      expect(value).to.not.include("emailAddress");
      expect(value).to.not.include("deliveryAddress_selectedAddress");
    });

    it("renames keys and strips unknown fields for an email delivery", () => {
      const { error, value } = saveRiskReportDetailsSchema.validate(
        baseEmailState
      );
      expect(error).to.be.undefined();
      expect(value).to.equal({
        uuid: "abc-123",
        firstName: "Jane",
        lastName: "Doe",
        deliveryMethod: "email",
        email: "jane.doe@example.com",
        telephone: "dummy-telephone",
        fullAddress: "test",
      });
    });

    it("accepts an address object when deliveryMethod is post", () => {
      const state = {
        ...basePostState,
        deliveryAddress_selectedAddress: {
          address: "10 Downing Street",
          postcode: "SW1A 2AA",
        },
      };
      const { error, value } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.be.undefined();
      expect(value.fullAddress).to.equal({
        address: "10 Downing Street",
        postcode: "SW1A 2AA",
      });
    });

    it("allows email to be omitted when deliveryMethod is post", () => {
      const state = { ...basePostState };
      delete (state as any).emailAddress;
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.be.undefined();
    });
  });

  describe("invalid payloads", () => {
    it("errors when firstName is missing", () => {
      const state = { ...basePostState, firstName: undefined };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("firstName");
    });

    it("errors when lastName is missing", () => {
      const state = { ...basePostState, lastName: undefined };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("lastName");
    });

    it("errors when uuid is missing", () => {
      const state = { ...basePostState, uuid: undefined };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("uuid");
    });

    it("errors when deliveryMethod is post and address is missing", () => {
      const state = {
        ...basePostState,
        deliveryAddress_selectedAddress: undefined,
      };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("fullAddress");
    });

    it("errors when deliveryMethod is email and email is missing", () => {
      const state = { ...baseEmailState, emailAddress: undefined };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("email");
    });

    it("errors when deliveryMethod is not a valid value", () => {
      const state = { ...basePostState, deliveryMethod: "carrier-pigeon" };
      const { error } = saveRiskReportDetailsSchema.validate(state);
      expect(error).to.exist();
      expect(error!.message).to.include("deliveryMethod");
    });
  });
});
