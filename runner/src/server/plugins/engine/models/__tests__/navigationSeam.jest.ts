import { FormModel } from "server/plugins/engine/models";

const def = {
  startPage: "/first",
  pages: [
    {
      title: "First",
      path: "/first",
      components: [
        { type: "TextField", name: "a", title: "A", options: {}, schema: {} },
      ],
      next: [{ path: "/summary" }],
    },
    { title: "Summary", path: "/summary", controller: "./pages/summary.js" },
  ],
  sections: [],
  lists: [],
  conditions: [],
  fees: [],
  outputs: [],
};

const makeRequest = (state: any, payload: any = {}, query: any = {}) => {
  const cacheService = {
    getState: async () => state,
    mergeState: async (_r, update) => ({ ...state, ...update }),
  };
  return {
    query,
    payload,
    path: "/m/first",
    url: { search: "" },
    pre: {},
    state: {},
    yar: { set: jest.fn(), get: jest.fn() },
    i18n: { setLocale: jest.fn() },
    services: () => ({ cacheService }),
    logger: { error: jest.fn() },
  } as any;
};

const h: any = {
  view: (name, vm) => ({ name, vm, source: { context: vm } }),
  redirect: (url) => ({ redirectedTo: url }),
  continue: Symbol("continue"),
};

const build = () => {
  const model = new FormModel(def, { basePath: "m" });
  const proceed = jest
    .spyOn(model, "proceed")
    .mockReturnValue({ proceeded: true } as any);
  jest.spyOn(model, "getBackLink").mockReturnValue("/from-model");
  jest
    .spyOn(model, "getSummaryBackLink")
    .mockReturnValue("/summary-from-model");
  const page = model.pages.find((p) => p.path === "/first");
  return { model, page, proceed };
};

describe("navigation seam", () => {
  test("a page POST delegates next / returnUrl to model.proceed", async () => {
    const { page, proceed } = build();

    const result = await page.makePostRouteHandler()(
      makeRequest({}, { a: "x" }),
      h
    );

    expect(result).toEqual({ proceeded: true });
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  test("a page GET takes its Back link from model.getBackLink", async () => {
    const { page } = build();

    const result: any = await page.makeGetRouteHandler()(
      makeRequest({ progress: ["/m/first"] }),
      h
    );

    expect(result.vm.backLink).toBe("/from-model");
  });

  test("a page re-rendered with errors takes its Back link from model.getBackLink", async () => {
    const { page } = build();

    const result: any = await page.makePostRouteHandler()(
      makeRequest({ progress: ["/m/first"] }, { a: "" }),
      h
    );

    expect(result.vm.backLink).toBe("/from-model");
  });

  test("a summary page takes its Back link from model.getSummaryBackLink", async () => {
    const { model } = build();
    const summary = model.pages.find((p) => p.path === "/summary");

    const result: any = await summary.makeGetRouteHandler()(
      makeRequest({ a: "x", progress: ["/m/first"] }),
      h
    );

    expect(result.vm.backLink).toBe("/summary-from-model");
  });
});
