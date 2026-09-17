import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";

import { PageControllerBase } from "server/plugins/engine/pageControllers";
import { FormModel } from "src/server/plugins/engine/models/FormModel";

const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, test } = lab;

suite("PageControllerBase", () => {
  test("getErrors correctly parses ISO string to readable string", () => {
    const def = {
      title: "When will you get married?",
      path: "/first-page",
      name: "",
      components: [
        {
          name: "approximate",
          options: {
            required: true,
            maxDaysInFuture: 30,
          },
          type: "DateField",
          title: "Approximate date of marriage",
          schema: {},
        },
      ],
      next: [
        {
          path: "/second-page",
        },
      ],
    };
    const page = new PageControllerBase(
      new FormModel(
        {
          pages: [],
          startPage: "/start",
          sections: [],
          lists: [],
          conditions: [],
        },
        {}
      ),
      def
    );
    const error = {
      error: {
        details: [
          {
            message:
              '"Approximate date of marriage" must be on or before 2021-12-25T00:00:00.000Z',
            path: ["approximate"],
          },
          {
            message: "something invalid",
            path: ["somethingElse"],
          },
        ],
      },
    };

    expect(page.getErrors(error)).to.equal({
      titleText: "There is a problem",
      errorList: [
        {
          path: "approximate",
          href: "#approximate",
          name: "approximate",
          text: `"Approximate date of marriage" must be on or before 25 December 2021`,
        },
        {
          path: "somethingElse",
          href: "#somethingElse",
          name: "somethingElse",
          text: "something invalid",
        },
      ],
    });
  });

  suite("proceed", () => {
    const mockH = { redirect: (path: string) => path };
    const requestWithReturnUrl = {
      query: { returnUrl: "/return-here" },
    } as any;

    const buildPage = (honorReturnURL: any) => {
      const model = new FormModel(
        {
          pages: [
            { path: "/second-page", title: "Second page", components: [] },
          ],
          startPage: "/start",
          sections: [],
          lists: [],
          conditions: [],
        },
        { basePath: "test-form" }
      );
      model.conditions = {
        matchingCondition: { fn: (state: any) => state.foo === true },
      } as any;

      return new PageControllerBase(model, {
        path: "/first-page",
        title: "First page",
        name: "",
        components: [],
        next: [{ path: "/second-page" }],
        options: { honorReturnURL },
      });
    };

    test("honours a plain boolean honorReturnURL as before", () => {
      const page = buildPage(false);
      const result = page.proceed(requestWithReturnUrl, mockH as any, {});
      expect(result).to.startWith("/test-form/second-page");
    });

    test("resolves a conditional array to false when a condition matches", () => {
      const page = buildPage([
        { condition: "matchingCondition", value: false },
        { value: true },
      ]);
      const result = page.proceed(requestWithReturnUrl, mockH as any, {
        foo: true,
      });
      expect(result).to.startWith("/test-form/second-page");
    });

    test("falls back to true when no conditional case matches", () => {
      const page = buildPage([
        { condition: "matchingCondition", value: false },
      ]);
      const result = page.proceed(requestWithReturnUrl, mockH as any, {
        foo: false,
      });
      expect(result).to.equal("/return-here");
    });
  });
});
