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

const formFilePath = path.join(__dirname, "..", "..");

// previewMode gates the /publish, /published and /published/{id} routes -
// they let a caller persist an arbitrary form definition on the runner, and
// are only meant to exist for the designer's own preview flow
// (NCC-E034853-D3-FOS). previewMode is read from config at server start, so
// each suite below needs its own server built with config stubbed first.
//
// server.match() is used instead of a live request: when these routes
// aren't registered, /publish and /published collide with the engine's
// generic `/{id}/{path*}` catch-all (it matches a single segment too), which
// resolves to unrelated, CSRF/content-type-gated handler logic rather than a
// plain 404. match() reports which route definition would actually handle
// the request, which is the fact this guard is about.
suite("Publish routes (previewMode guard)", () => {
  suite("previewMode: false", () => {
    let server;

    before(async () => {
      sinon.stub(config, "previewMode").value(false);
      server = await createServer({
        formFileName: "basic-v0.json",
        formFilePath,
      });
      await server.start();
    });

    after(async () => {
      await server.stop();
      sinon.restore();
    });

    test("POST /publish is not registered", () => {
      const match = server.match("post", "/publish");
      expect(match?.path).to.not.equal("/publish");
    });

    test("GET /published is not registered", () => {
      const match = server.match("get", "/published");
      expect(match?.path).to.not.equal("/published");
    });

    test("GET /published/{id} is not registered", () => {
      const match = server.match("get", "/published/basic-v0");
      expect(match?.path).to.not.equal("/published/{id}");
    });
  });

  suite("previewMode: true", () => {
    let server;

    before(async () => {
      sinon.stub(config, "previewMode").value(true);
      server = await createServer({
        formFileName: "basic-v0.json",
        formFilePath,
      });
      await server.start();
    });

    after(async () => {
      await server.stop();
      sinon.restore();
    });

    test("POST /publish is registered", () => {
      const match = server.match("post", "/publish");
      expect(match?.path).to.equal("/publish");
    });

    test("GET /published is registered", () => {
      const match = server.match("get", "/published");
      expect(match?.path).to.equal("/published");
    });

    test("GET /published/{id} is registered", () => {
      const match = server.match("get", "/published/basic-v0");
      expect(match?.path).to.equal("/published/{id}");
    });
  });
});
