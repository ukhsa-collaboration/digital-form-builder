import path from "path";
import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import createServer from "src/server";
import config from "src/server/config";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { after, before, suite, test } = lab;

const formsPath = path.join(__dirname, "../../../../../../src/server/forms");
const fixturesPath = path.join(__dirname, "..", "..", "..");

// When previewMode is off, PageControllerBase redirects any page to the form's
// start page if the session has no progress. Deployed environments ran with
// previewMode on until the publish routes were locked down
// (NCC-E034853-D3-FOS), so magic link forms had never run with this redirect.
// Their /start page only redirects to /email without recording progress, so
// /email looped back to /start, and users arriving from the emailed link in a
// new session were sent to /email instead of seeing /expired.
const magicLinkForms = [
  "magic-link",
  "kls-magic-link",
  "kls-training-magic-link",
];

magicLinkForms.forEach((formId) => {
  suite(`Start page redirect - ${formId} (previewMode: false)`, () => {
    let server;

    before(async () => {
      sinon.stub(config, "previewMode").value(false);
      server = await createServer({
        formFileName: `${formId}.json`,
        formFilePath: formsPath,
      });
      await server.start();
    });

    after(async () => {
      await server.stop();
      sinon.restore();
    });

    test("/start leads to a rendered /email page instead of looping", async () => {
      const start = await server.inject({
        method: "get",
        url: `/${formId}/start`,
      });
      expect(start.statusCode).to.equal(302);
      expect(start.headers.location).to.equal(`/${formId}/email`);

      const cookie = (start.headers["set-cookie"] ?? [])
        .map((c: string) => c.split(";")[0])
        .join("; ");
      const email = await server.inject({
        method: "get",
        url: `/${formId}/email`,
        headers: { cookie },
      });
      expect(email.statusCode).to.equal(200);
    });

    test("/expired renders for a new session arriving from the emailed link", async () => {
      const expired = await server.inject({
        method: "get",
        url: `/${formId}/expired`,
      });
      expect(expired.statusCode).to.equal(200);
    });
  });
});

suite("Start page redirect - non magic link form (previewMode: false)", () => {
  let server;

  before(async () => {
    sinon.stub(config, "previewMode").value(false);
    server = await createServer({
      formFileName: "basic-v0.json",
      formFilePath: fixturesPath,
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
    sinon.restore();
  });

  test("a page other than the start page still redirects to the start page", async () => {
    const response = await server.inject({
      method: "get",
      url: "/basic-v0/full-name",
    });
    expect(response.statusCode).to.equal(302);
    expect(response.headers.location).to.equal("/basic-v0/start");
  });
});
