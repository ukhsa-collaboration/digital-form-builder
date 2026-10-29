import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";

import { RepeatedMultiFieldPageController } from "server/plugins/engine/pageControllers/RepeatedMultiFieldPageController";
import { FormModel } from "src/server/plugins/engine/models/FormModel";

const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, test } = lab;

const emptyModel = new FormModel(
  {
    pages: [],
    startPage: "/start",
    sections: [],
    lists: [],
    conditions: [],
  },
  {}
);

const pageDef = {
  path: "/which-languages-do-you-translate-or-interpret",
  name: "",
  options: {
    sectionKey: "people_you_live_with",
  },
  components: [
    {
      name: "Name",
      type: "TextField",
      title: "Your name",
      schema: {},
      options: {},
    },
  ],
  next: [],
};

suite("RepeatedMultiFieldPageController", () => {
  test("toWebhookQuestions renders the page title", () => {
    const page = new RepeatedMultiFieldPageController(emptyModel, {
      ...pageDef,
      title: "Select Interpreters",
    } as any);

    const [question] = page.toWebhookQuestions({
      people_you_live_with: [{ Name: "Alice" }],
    });

    expect(question.question).to.equal("Select Interpreters");
  });

  test("toWebhookQuestions does not crash for a page without a title", () => {
    const page = new RepeatedMultiFieldPageController(
      emptyModel,
      pageDef as any
    );

    const [question] = page.toWebhookQuestions({
      people_you_live_with: [{ Name: "Alice" }],
    });

    expect(question.question).to.equal("");
  });
});
