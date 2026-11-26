import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import createServer from "src/server";
import views from "src/server/plugins/views";
import { getPrePopParams } from "src/server/plugins/engine/pluginHandlers/prePopParams";
import { HapiRequest } from "src/server/types";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test, before, after } = lab;

const link = (html: string) =>
  html.match(/<a href="([^"]*)" class="govuk-button">/)?.[1];
const attr = (html: string, name: string) =>
  html.match(new RegExp(`<div id="prepop-params"[^>]* ${name}="([^"]*)"`))?.[1];

suite("Timeout query parameters: /{id}/timeout", () => {
  let server;

  before(async () => {
    server = await createServer({
      formFileName: "timeout-params.json",
      formFilePath: __dirname,
      enforceCsrf: false,
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  test("direct visit without a query links to the plain start page and keeps stored values", async () => {
    const response = await server.inject("/timeout-params/timeout");

    expect(response.statusCode).to.equal(200);
    expect(link(response.payload)).to.equal("/timeout-params");
    expect(attr(response.payload, "data-clear")).to.equal("false");
  });

  test("valid r and d are added to the start link and the stored values are cleared", async () => {
    const response = await server.inject(
      "/timeout-params/timeout?r=abc000&d=01F2"
    );

    expect(link(response.payload)).to.equal(
      "/timeout-params?r=abc000&amp;d=01F2"
    );
    expect(attr(response.payload, "data-clear")).to.equal("true");
  });

  test("only r and d are carried over", async () => {
    const response = await server.inject(
      "/timeout-params/timeout?r=abc000&returnUrl=https://evil.example&x=y"
    );

    expect(link(response.payload)).to.equal("/timeout-params?r=abc000");
  });

  test("unknown form id returns 404", async () => {
    const response = await server.inject("/no-such-form/timeout?r=abc000");

    expect(response.statusCode).to.equal(404);
  });
});

suite("Timeout query parameters: page data", () => {
  let server;

  before(async () => {
    server = await createServer({
      formFileName: "timeout-params.json",
      formFilePath: __dirname,
      enforceCsrf: false,
      options: { previewMode: false },
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  test("start page supplies the accepted r and d after arriving with a query", async () => {
    const first = await server.inject("/timeout-params?r=abc000&d=01F2");
    const cookie = String(
      first.headers["set-cookie"]?.find((c: string) => c.startsWith("session="))
    ).split(";")[0];
    const start = await server.inject({
      url: first.headers.location,
      headers: { cookie },
    });

    expect(attr(start.payload, "data-params")).to.equal(
      "{&quot;r&quot;:&quot;abc000&quot;,&quot;d&quot;:&quot;01F2&quot;}"
    );
    expect(attr(start.payload, "data-start-path")).to.equal(
      "/timeout-params/start"
    );
    expect(attr(start.payload, "data-clear")).to.equal("false");
  });

  test("a non-start page without a session redirects to a start page with no params", async () => {
    const second = await server.inject("/timeout-params/second");

    expect(second.statusCode).to.equal(302);

    const start = await server.inject(second.headers.location);

    expect(attr(start.payload, "data-params")).to.equal("{}");
  });
});

suite("Timeout query parameters: view context", () => {
  const context = views.options.context;
  const requestFor = (def: object | undefined, pre = {}) =>
    ({
      params: { id: "my-form" },
      server: { app: { forms: { "my-form": def && { def } } } },
      pre,
      app: {},
      auth: {},
    } as unknown as HapiRequest);

  test("is safe without a request", () => {
    const result = context();

    expect(result.formId).to.be.undefined();
    expect(result.prePopStartPath).to.be.undefined();
  });

  test("builds the start path from the form's startPage", () => {
    const result = context(requestFor({ startPage: "/start" }));

    expect(result.formId).to.equal("my-form");
    expect(result.prePopStartPath).to.equal("/my-form/start");
  });

  test("has no start path when startPage is missing, never the string undefined", () => {
    expect(context(requestFor({})).prePopStartPath).to.be.undefined();
  });

  test("has no start path when startPage is an external url", () => {
    const result = context(requestFor({ startPage: "https://gov.uk/start" }));

    expect(result.prePopStartPath).to.be.undefined();
  });

  test("only exposes prePopParams for a known form", () => {
    const pre = { prePopParams: { r: "abc000" } };

    expect(
      context(requestFor({ startPage: "/start" }, pre)).prePopParams
    ).to.equal({ r: "abc000" });
    expect(context(requestFor(undefined, pre)).prePopParams).to.be.undefined();
  });
});

suite("Timeout query parameters: getPrePopParams", () => {
  const getState = sinon.stub();
  const warn = sinon.stub();

  const requestFor = (
    fieldsForPrePopulation: Record<string, unknown>,
    formExists = true,
    yar: { id?: string } = { id: "session" }
  ) =>
    ({
      params: { id: "my-form" },
      yar,
      logger: { warn },
      server: {
        app: {
          forms: formExists ? { "my-form": { fieldsForPrePopulation } } : {},
        },
      },
      services: () => ({ cacheService: { getState } }),
    } as unknown as HapiRequest);

  const withRd = { r: { schema: {} }, d: { schema: {} } };

  lab.beforeEach(() => {
    getState.reset();
    warn.reset();
  });

  test("returns an empty object for an unknown form", async () => {
    expect(await getPrePopParams(requestFor(withRd, false))).to.equal({});
    expect(getState.called).to.be.false();
  });

  test("returns an empty object without a session", async () => {
    expect(await getPrePopParams(requestFor(withRd, true, {}))).to.equal({});
    expect(getState.called).to.be.false();
  });

  test("skips the cache read for a form without r or d pre-population", async () => {
    expect(
      await getPrePopParams(requestFor({ country: { schema: {} } }))
    ).to.equal({});
    expect(getState.called).to.be.false();
  });

  test("returns r and d held in the form's answers", async () => {
    getState.resolves({ r: "abc000", d: "01F2", other: "x" });

    expect(await getPrePopParams(requestFor(withRd))).to.equal({
      r: "abc000",
      d: "01F2",
    });
  });

  test("returns an empty object and logs when the cache read fails", async () => {
    getState.rejects(new Error("cache down"));

    expect(await getPrePopParams(requestFor(withRd))).to.equal({});
    expect(warn.calledOnce).to.be.true();
  });
});
