import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import Joi from "joi";
import { ContactDetailsCollection } from "server/plugins/engine/components/ContactDetailsCollection";
const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, describe, it } = lab;

suite("ContactDetailsCollection", () => {
  const formModel: any = {};

  const componentDefinition: any = {
    type: "ContactDetailsCollection",
    name: "contact_details_collection",
    title: "Contact details",
    options: {},
    schema: {},
  };

  describe("synthetic carrier field", () => {
    it("is rendered as a hidden input rather than an unlabelled text input", () => {
      const component = new ContactDetailsCollection(
        componentDefinition,
        formModel
      );

      const viewModel = component.getViewModel(
        { lang: "en" } as any,
        undefined as any
      );
      const carrier: any = viewModel.items.find(
        (item: any) => item.name === "contact_details_collection"
      );

      expect(carrier.type).to.equal("hidden");
      expect(carrier.label).to.equal(undefined);
    });

    it("still enforces that a mobile number or email address is provided", () => {
      const component = new ContactDetailsCollection(
        componentDefinition,
        formModel
      );
      const schema = Joi.object().keys(component.getFormSchemaKeys());
      const blank = {
        mobile_number: "",
        landline_number: "",
        email_address: "",
        contact_details_collection: "",
      };

      const empty = schema.validate(blank);
      const landlineOnly = schema.validate({
        ...blank,
        landline_number: "020 7123 4567",
      });
      const withEmail = schema.validate({
        ...blank,
        email_address: "name@example.com",
      });

      expect(empty.error?.details[0].path).to.equal([
        "contact_details_collection",
      ]);
      expect(landlineOnly.error?.details[0].path).to.equal([
        "contact_details_collection",
      ]);
      expect(withEmail.error).to.equal(undefined);
    });
  });
});
