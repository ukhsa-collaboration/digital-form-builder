import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { Fieldset } from "server/plugins/engine/components/Fieldset";
const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, describe, it } = lab;

suite("Fieldset", () => {
  const formModel: any = {};

  const componentDefinition: any = {
    type: "Fieldset",
    name: "address",
    title: "Address",
    options: {},
    schema: {},
    components: [
      {
        type: "TextField",
        name: "line1",
        title: "Line 1",
        options: {},
        schema: {},
      },
      {
        type: "TextField",
        name: "line2",
        title: "Line 2",
        options: { required: false },
        schema: {},
      },
    ],
  };

  const componentDefinitionWithValidation: any = {
    ...componentDefinition,
    options: {
      validation: [
        {
          fields: ["line1", "line2"],
          minRequired: 1,
          errorMessage: "Enter at least one line",
        },
      ],
    },
  };

  describe("getStateSchemaKeys", () => {
    it("merges the fieldset's own key with its children's state schema keys", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const keys = fieldset.getStateSchemaKeys();

      expect(Object.keys(keys)).to.equal(["line1", "line2", "address"]);
    });
  });

  describe("getFormDataFromState", () => {
    it("returns undefined when the fieldset's own key is absent from state", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const state = { line1: "123 Street", line2: "Townsville" };

      const formData = fieldset.getFormDataFromState(state);

      expect(formData).to.equal(undefined);
    });

    it("reads children from state nested under the fieldset's own key", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const state = { address: { line1: "123 Street", line2: "Townsville" } };

      const formData = fieldset.getFormDataFromState(state);

      expect(formData).to.equal({
        address: { line1: "123 Street", line2: "Townsville" },
      });
    });
  });

  describe("getStateValueFromValidForm / getStateFromValidForm", () => {
    it("returns the children's state merged together, keyed by child name", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const payload = { line1: "123 Street", line2: "Townsville" };

      const value = fieldset.getStateValueFromValidForm(payload);

      expect(value).to.equal({ line1: "123 Street", line2: "Townsville" });
    });

    it("nests that merged child state under the fieldset name", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const payload = { line1: "123 Street", line2: "Townsville" };

      const state = fieldset.getStateFromValidForm(payload);

      expect(state).to.equal({
        address: { line1: "123 Street", line2: "Townsville" },
      });
    });

    it("strips the synthetic carrier field used for cross-field validation", () => {
      const fieldset = new Fieldset(
        componentDefinitionWithValidation,
        formModel
      );
      const payload = {
        line1: "123 Street",
        line2: "Townsville",
        address: "synthetic carrier value",
      };

      const value = fieldset.getStateValueFromValidForm(payload);

      expect(value).to.equal({ line1: "123 Street", line2: "Townsville" });
    });

    it("coerces a missing/blank optional child value to an empty string instead of null", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const payload = { line1: "123 Street" }; // line2 omitted, and optional

      const value = fieldset.getStateValueFromValidForm(payload);

      expect(value).to.equal({ line1: "123 Street", line2: "" });
    });
  });

  describe("getDisplayStringFromState", () => {
    it("reads children from state nested under the fieldset's own key, joining their display strings", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const state = { address: { line1: "123 Street", line2: "Townsville" } };

      const display = fieldset.getDisplayStringFromState(state);

      expect(display).to.equal("123 Street, Townsville");
    });

    it("returns an empty string when the fieldset's own key is absent from state", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const state = { line1: "123 Street", line2: "Townsville" };

      const display = fieldset.getDisplayStringFromState(state);

      expect(display).to.equal("");
    });

    it("skips children whose display string is blank or whitespace-only", () => {
      const fieldset = new Fieldset(componentDefinition, formModel);
      const state = { address: { line1: "123 Street", line2: "   " } };

      const display = fieldset.getDisplayStringFromState(state);

      expect(display).to.equal("123 Street");
    });
  });
});
