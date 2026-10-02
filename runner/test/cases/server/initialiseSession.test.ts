import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
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
    const res = await server.inject({
      method: "POST",
      url: "/session/basic-v0",
      payload: {
        options: { callbackUrl: "https://not-on-safelist.invalid" },
        questions: [],
      },
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
