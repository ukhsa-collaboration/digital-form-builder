import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import crypto from "crypto";
import { MagicLinkController } from "server/plugins/engine/pageControllers/MagicLinkController";
import { buildMagicLinkReturnPath } from "server/plugins/engine/pageControllers/MagicLinkSubmissionPageController";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test } = lab;

const hmacKey = "test-hmac-key";

const sign = (email: string, requestTime: string) =>
  crypto
    .createHmac("sha256", hmacKey)
    .update(email + requestTime)
    .digest("hex");

const controller = () =>
  new MagicLinkController(
    {
      def: {
        name: "Report an outbreak (Magic Link)",
        skipSummary: true,
        outputs: [{ outputConfiguration: { hmacKey } }],
      },
      basePath: "magic-link",
      sections: [],
      fieldsForPrePopulation: {},
    } as any,
    { path: "/return", title: "return", components: [] }
  );

const toolkit = () => {
  const redirected: { code: () => string; path?: string } = {
    code: () => "redirected",
  };
  return {
    view: (
      template: string,
      context: { pageTitle: string; page: { showContinueButton?: boolean } }
    ) => ({
      template,
      context,
    }),
    redirect: (path: string) => {
      redirected.path = path;
      return redirected;
    },
    response: () => ({ code: () => "ignored" }),
    redirected,
  };
};

suite("Magic link return", () => {
  test("GET does not redeem the link, so a mail scanner cannot expire it", async () => {
    const email = "manager@care.example";
    const requestTime = `${Math.floor(Date.now() / 1000)}`;
    const signature = sign(email, requestTime);
    const deleteMagicLinkRecord = () => {
      throw new Error("GET must not delete the magic link record");
    };
    const h = toolkit();

    const result = await controller().makeGetRouteHandler()(
      {
        query: { email, signature, request_time: requestTime },
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; Microsoft Outlook SafeLinks)",
        },
        services: () => ({
          magicLinkCacheService: {
            searchForMagicLinkRecord: async () => ({
              hmac: signature,
              active: Number(requestTime),
            }),
            deleteMagicLinkRecord,
          },
        }),
      } as any,
      h as any
    );

    expect(result.template).to.equal("index");
    expect(result.context.pageTitle).to.equal("Confirm your email address");
    expect(result.context.page.showContinueButton).to.equal(true);
  });

  test("GET still sends a missing record to the expired page", async () => {
    const email = "manager@care.example";
    const requestTime = `${Math.floor(Date.now() / 1000)}`;
    const h = toolkit();

    await controller().makeGetRouteHandler()(
      {
        query: {
          email,
          signature: sign(email, requestTime),
          request_time: requestTime,
        },
        headers: { "user-agent": "Mozilla/5.0" },
        services: () => ({
          magicLinkCacheService: {
            searchForMagicLinkRecord: async () => null,
            deleteMagicLinkRecord: async () => undefined,
          },
        }),
      } as any,
      h as any
    );

    expect(h.redirected.path).to.equal("/magic-link/expired");
  });

  test("return path keeps a plus in the email", () => {
    const path = buildMagicLinkReturnPath(
      "magic-link",
      "deputy+unit@care.example",
      1700000000,
      "abc"
    );

    expect(path).to.contain("email=deputy%2Bunit%40care.example");
    expect(new URLSearchParams(path.split("?")[1]).get("email")).to.equal(
      "deputy+unit@care.example"
    );
  });
});
