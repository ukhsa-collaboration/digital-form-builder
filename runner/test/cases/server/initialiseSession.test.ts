import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import FormData from "form-data";
import createServer from "src/server";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { after, before, suite, test } = lab;

suite("initialiseSession plugin", () => {
  let server;

  before(async () => {
    server = await createServer({
      formFileName: "basic-v0.json",
      formFilePath: __dirname,
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  test("POST /session/{formId} is not registered", async () => {
    // Real HTTP request rather than server.inject: the request now falls
    // through to the engine's POST /{id}/{path*} route, and a JSON body only
    // reaches its file prehandlers on a real request stream, not shot's
    // simulated one
    const res = await fetch(`${server.info.uri}/session/basic-v0`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        options: { callbackUrl: "https://not-on-safelist.invalid" },
        questions: [],
      }),
    });

    expect(res.status).to.equal(404);
  });

  test("POST /session/{formId} with a file upload returns 404", async () => {
    const form = new FormData();
    form.append("file1", Buffer.from("an image.."), {
      filename: "file.png",
      contentType: "image/png",
    });

    const res = await server.inject({
      method: "POST",
      url: "/session/basic-v0",
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(res.statusCode).to.equal(404);
  });

  test("GET /session/{token} is not registered", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/session/eyJhbGciOiJIUzUxMiJ9.e30.sig",
    });

    expect(res.statusCode).to.equal(404);
  });

  test("POST /session/keep-alive still works", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/session/keep-alive",
    });

    expect(res.statusCode).to.equal(204);
  });
});
