import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { HiddenField } from "server/plugins/engine/components/HiddenField";
const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, describe, it } = lab;

suite("HiddenField", () => {
  const formModel: any = {};
  const def: any = {
    type: "HiddenField",
    name: "carrier",
    title: "Carrier",
    options: {},
    schema: {},
  };

  describe("getViewModel", () => {
    it("exposes id and name, and does not set an HTML input type", () => {
      const viewModel: any = new HiddenField(def, formModel).getViewModel(
        {} as any,
        undefined
      );

      expect(viewModel.id).to.equal("carrier");
      expect(viewModel.name).to.equal("carrier");
      expect(viewModel.type).to.be.undefined();
    });

    it("uses the submitted form data value", () => {
      const viewModel: any = new HiddenField(def, formModel).getViewModel(
        { carrier: "abc" } as any,
        undefined
      );

      expect(viewModel.value).to.equal("abc");
    });

    it("prefers options.value over form data", () => {
      const viewModel: any = new HiddenField(
        { ...def, options: { value: "fixed" } },
        formModel
      ).getViewModel({ carrier: "abc" } as any, undefined);

      expect(viewModel.value).to.equal("fixed");
    });

    it("defaults to an empty string", () => {
      const viewModel: any = new HiddenField(def, formModel).getViewModel(
        {} as any,
        undefined
      );

      expect(viewModel.value).to.equal("");
    });
  });
});
