import path from "path";
import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import FormData from "form-data";
import sinon from "sinon";
import Jwt from "@hapi/jwt";
import createServer from "src/server";
import config from "src/server/config";
import authForm from "../../../restart-session-auth.json";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { after, before, beforeEach, suite, test } = lab;

const fixturesPath = path.join(__dirname, "..", "..", "..");

function trackSessionIds(server) {
  const ids: string[] = [];

  server.ext("onPreResponse", (request, h) => {
    ids.push(request.yar?.id);
    return h.continue;
  });

  return ids;
}

function getCookies(response, existing = "") {
  const updates = (response.headers["set-cookie"] ?? []).map(
    (c: string) => c.split(";")[0]
  );

  const cookieMap = new Map<string, string>();

  [...existing.split("; ").filter(Boolean), ...updates].forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    cookieMap.set(name, rest.join("="));
  });

  return [...cookieMap.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function post(server, url, cookie, field?: string, value?: string) {
  const form = new FormData();

  if (field) {
    form.append(field, value);
  }

  return server.inject({
    method: "post",
    url,
    headers: { ...form.getHeaders(), cookie },
    payload: form.getBuffer(),
  });
}

function getState(server, formId: string, sessionId: string) {
  const { cacheService } = server.services();

  return cacheService.getState({
    yar: { id: sessionId },
    params: { id: formId },
  });
}

suite("restartSessionOnSubmit - unconditional navigation", () => {
  const basePath = "/restart-session-unconditional";
  const formId = "restart-session-unconditional";
  let server;
  let sessionIds;

  before(async () => {
    sinon.stub(config, "previewMode").value(false);
    server = await createServer({
      formFileName: "restart-session-unconditional.json",
      formFilePath: fixturesPath,
      enforceCsrf: false,
    });
    sessionIds = trackSessionIds(server);
    await server.initialize();
  });

  after(async () => {
    await server.stop();
    sinon.restore();
  });

  beforeEach(() => {
    sessionIds.length = 0;
  });

  async function startJourneyAndSubmitText() {
    const start = await server.inject({
      method: "get",
      url: `${basePath}/start`,
    });
    let cookie = getCookies(start);

    const afterStart = await post(server, `${basePath}/start`, cookie);
    cookie = getCookies(afterStart, cookie);

    const namePage = await server.inject({
      method: "get",
      url: `${basePath}/text`,
      headers: { cookie },
    });
    cookie = getCookies(namePage, cookie);

    const afterName = await post(
      server,
      `${basePath}/text`,
      cookie,
      "text",
      "Test text 1"
    );

    return getCookies(afterName, cookie);
  }

  test("a fresh session proceeds to the next page", async () => {
    const start = await server.inject({
      method: "get",
      url: `${basePath}/start`,
    });
    const cookie = getCookies(start);
    const idBeforeSubmit = sessionIds[sessionIds.length - 1];

    const submit = await post(server, `${basePath}/start`, cookie);
    const nextPage = submit.headers.location;
    const currentId = sessionIds[sessionIds.length - 1];

    expect(nextPage).to.equal(`${basePath}/text`);
    expect(currentId).to.equal(idBeforeSubmit);

    const next = await server.inject({
      method: "get",
      url: nextPage,
      headers: { cookie: getCookies(submit, cookie) },
    });
    expect(next.statusCode).to.equal(200);
  });

  test("old session is destroyed on submit on start page", async () => {
    let cookie = await startJourneyAndSubmitText();

    const startAgain = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie },
    });

    cookie = getCookies(startAgain, cookie);
    const idBeforeRestart = sessionIds[sessionIds.length - 1];

    const restartRes = await post(server, `${basePath}/start`, cookie);
    const nextPage = restartRes.headers.location;
    const currentId = sessionIds[sessionIds.length - 1];
    const state = await getState(server, formId, currentId);

    // Journey will progress to the next page
    expect(restartRes.statusCode).to.equal(302);
    expect(nextPage).to.equal(`${basePath}/text`);

    // The current session ID is different
    expect(currentId).to.not.equal(idBeforeRestart);

    // The session state only holds first page progress and no previous answers
    expect(state).to.equal({
      progress: [`${basePath}/start`],
    });
    expect(state.text).to.be.undefined();

    cookie = getCookies(restartRes, cookie);
    const next = await server.inject({
      method: "get",
      url: nextPage,
      headers: { cookie },
    });

    // Successfully get the next page
    expect(next.statusCode).to.equal(200);
  });

  test("restart on non-start page redirects to start page", async () => {
    let cookie = await startJourneyAndSubmitText();

    const restartPage = await server.inject({
      method: "get",
      url: `${basePath}/restart`,
      headers: { cookie },
    });
    cookie = getCookies(restartPage, cookie);

    const idBeforeRestart = sessionIds[sessionIds.length - 1];

    const restartRes = await post(server, `${basePath}/restart`, cookie);

    // The form redirects to end-session
    expect(restartRes.statusCode).to.equal(302);
    expect(restartRes.headers.location).to.equal(
      `/end-session?redirect=${encodeURIComponent(`${basePath}/start`)}`
    );

    const endSessionRes = await server.inject({
      method: "get",
      url: restartRes.headers.location,
      headers: { cookie },
    });
    cookie = getCookies(endSessionRes, cookie);

    // Session ID is changed
    const currentId = sessionIds[sessionIds.length - 1];
    expect(currentId).to.not.equal(idBeforeRestart);

    // End session redirects to start page
    expect(endSessionRes.statusCode).to.equal(302);
    expect(endSessionRes.headers.location).to.equal(`${basePath}/start`);

    const startAgain = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie },
    });
    cookie = getCookies(startAgain, cookie);
    const state = await getState(server, formId, currentId);

    // The session state only holds first page progress and no previous answers
    expect(state).to.equal({
      progress: [`${basePath}/start`],
    });
    expect(state.text).to.be.undefined();
  });
});

suite("start pages with payloads still process payload", () => {
  const basePath = "/restart-session-conditional";
  const formId = "restart-session-conditional";
  let server;
  let sessionIds;

  before(async () => {
    sinon.stub(config, "previewMode").value(false);
    server = await createServer({
      formFileName: "restart-session-conditional.json",
      formFilePath: fixturesPath,
      enforceCsrf: false,
    });
    sessionIds = trackSessionIds(server);
    await server.initialize();
  });

  after(async () => {
    await server.stop();
    sinon.restore();
  });

  beforeEach(() => {
    sessionIds.length = 0;
  });

  test(`start page input pathA routes to /pathA on a first visit`, async () => {
    const start = await server.inject({
      method: "get",
      url: `${basePath}/start`,
    });
    const cookie = getCookies(start);
    const idBeforeSubmit = sessionIds[sessionIds.length - 1];

    const submit = await post(
      server,
      `${basePath}/start`,
      cookie,
      "path",
      "pathA"
    );

    const currentId = sessionIds[sessionIds.length - 1];
    const state = await getState(server, formId, currentId);
    const nextPage = submit.headers.location;

    // Form navigates to the correct page
    expect(submit.statusCode).to.equal(302);
    expect(nextPage).to.equal(`${basePath}/pathA`);

    // The session ID remains the same
    expect(currentId).to.equal(idBeforeSubmit);

    // The answer remains stored in the session
    expect(state.path).to.equal("pathA");

    const next = await server.inject({
      method: "get",
      url: nextPage,
      headers: { cookie: getCookies(submit, cookie) },
    });

    // The next page renders successfully
    expect(next.statusCode).to.equal(200);
  });

  test("start page input survives a restart and routes down new path", async () => {
    const start = await server.inject({
      method: "get",
      url: `${basePath}/start`,
    });
    let cookie = getCookies(start);

    const firstRes = await post(
      server,
      `${basePath}/start`,
      cookie,
      "path",
      "pathA"
    );
    cookie = getCookies(firstRes, cookie);

    const restartRes = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie },
    });
    cookie = getCookies(restartRes, cookie);

    const idBeforeRestart = sessionIds[sessionIds.length - 1];
    expect((await getState(server, formId, idBeforeRestart)).path).to.equal(
      "pathA"
    );

    const newChoiceRes = await post(
      server,
      `${basePath}/start`,
      cookie,
      "path",
      "pathB"
    );
    cookie = getCookies(newChoiceRes, cookie);

    const currentId = sessionIds[sessionIds.length - 1];
    const nextPage = newChoiceRes.headers.location;
    const state = await getState(server, formId, currentId);

    // The session ID changes
    expect(currentId).to.not.equal(idBeforeRestart);

    // The form navigates to pathB
    expect(newChoiceRes.statusCode).to.equal(302);
    expect(nextPage).to.equal(`${basePath}/pathB`);

    // Path choice is saved to the state
    expect(state.path).to.equal("pathB");

    const next = await server.inject({
      method: "get",
      url: `${basePath}/pathB`,
      headers: { cookie },
    });

    // Successfully navigate to pathB
    expect(next.statusCode).to.equal(200);
  });

  test("invalid start page submission re-renders with errors without restarting", async () => {
    const start = await server.inject({
      method: "get",
      url: `${basePath}/start`,
    });
    let cookie = getCookies(start);

    const first = await post(
      server,
      `${basePath}/start`,
      cookie,
      "path",
      "pathA"
    );
    cookie = getCookies(first, cookie);

    const startAgain = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie },
    });
    cookie = getCookies(startAgain, cookie);
    const idBeforeSubmit = sessionIds[sessionIds.length - 1];

    const invalidRes = await post(server, `${basePath}/start`, cookie);
    const currentId = sessionIds[sessionIds.length - 1];
    const state = await getState(server, formId, currentId);

    // Page has errors
    expect(invalidRes.payload).to.contain("govuk-error-summary");

    // The session ID does not change
    expect(currentId).to.equal(idBeforeSubmit);

    // The state remains unchanged
    expect(state.path).to.equal("pathA");
  });
});

suite("authenticated forms keep auth cookies", () => {
  const basePath = "/restart-session-auth";
  const formId = "restart-session-auth";
  let server;
  let sessionIds;
  let authToken;

  before(async () => {
    sinon.stub(config, "previewMode").value(false);
    server = await createServer({
      formFileName: "restart-session-auth.json",
      formFilePath: fixturesPath,
      enforceCsrf: false,
    });
    sessionIds = trackSessionIds(server);
    await server.initialize();

    authToken = Jwt.token.generate(
      { email: "someone@example.com" },
      { key: authForm.jwtKey, algorithm: config.initialisedSessionAlgorithm },
      { ttlSec: 20 * 60 }
    );
  });

  after(async () => {
    await server.stop();
    sinon.restore();
  });

  beforeEach(() => {
    sessionIds.length = 0;
  });

  test("auth_token and magicLinkRetry survive the restart and the user stays verified", async () => {
    const verified = `auth_token=${authToken}; magicLinkRetry=2`;

    const startRes = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie: verified },
    });
    let cookie = getCookies(startRes, verified);

    const startPostRes = await post(server, `${basePath}/start`, cookie);
    cookie = getCookies(startPostRes, cookie);

    const detailsPageRes = await server.inject({
      method: "get",
      url: `${basePath}/your-details`,
      headers: { cookie },
    });
    cookie = getCookies(detailsPageRes, cookie);
    expect(detailsPageRes.statusCode).to.equal(200);

    const detailsPostRes = await post(
      server,
      `${basePath}/your-details`,
      cookie,
      "text",
      "Test text 1"
    );
    cookie = getCookies(detailsPostRes, cookie);

    const startAgain = await server.inject({
      method: "get",
      url: `${basePath}/start`,
      headers: { cookie },
    });
    cookie = getCookies(startAgain, cookie);
    const idBeforeRestart = sessionIds[sessionIds.length - 1];

    const restartRes = await post(server, `${basePath}/start`, cookie);

    const currentId = sessionIds[sessionIds.length - 1];
    const nextPage = restartRes.headers.location;
    const state = await getState(server, formId, currentId);

    // Form navigates to next page
    expect(restartRes.statusCode).to.equal(302);
    expect(nextPage).to.equal(`${basePath}/your-details`);

    // Session ID changes
    expect(currentId).to.not.equal(idBeforeRestart);

    // The session state only holds first page progress and no previous answers
    expect(state).to.equal({
      progress: [`${basePath}/start`],
    });
    expect(state.text).to.be.undefined;

    // Auth cookies are not being changed
    const cleared = (restartRes.headers["set-cookie"] ?? []).filter(
      (c: string) => /^(auth_token|magicLinkRetry)=;/.test(c)
    );
    expect(cleared).to.have.length(0);

    cookie = getCookies(restartRes, cookie);

    // Auth cookies remain
    expect(cookie).to.contain(`auth_token=${authToken}`);
    expect(cookie).to.contain("magicLinkRetry=2");

    // Auth gate passes and successful gets the next page
    const details = await server.inject({
      method: "get",
      url: nextPage,
      headers: { cookie },
    });
    expect(details.statusCode).to.equal(200);
  });
});
