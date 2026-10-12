import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import crypto from "crypto";
import { MagicLinkController } from "server/plugins/engine/pageControllers/MagicLinkController";

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
        jwtKey: "test-jwt-key-with-enough-length-for-hs512",
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
    redirect: (path: string) => {
      redirected.path = path;
      return redirected;
    },
    response: () => ({ code: () => "ignored" }),
    state: () => undefined,
    redirected,
  };
};

suite("Magic link return", () => {
  test("opening the link does not expire it", async () => {
    const email = "manager@care.example";
    const requestTime = `${Math.floor(Date.now() / 1000)}`;
    const signature = sign(email, requestTime);
    let deleted = false;
    const h = toolkit();

    await controller().makeGetRouteHandler()(
      {
        query: { email, signature, request_time: requestTime },
        params: { id: "magic-link" },
        headers: { "user-agent": "Mozilla/5.0" },
        services: () => ({
          magicLinkCacheService: {
            searchForMagicLinkRecord: async () => ({
              hmac: signature,
              active: Number(requestTime),
            }),
            deleteMagicLinkRecord: async () => {
              deleted = true;
            },
            repopulateFormStateUponMagicLinkReturn: async () => undefined,
          },
        }),
      } as any,
      h as any
    );

    expect(deleted).to.equal(false);
    expect(h.redirected.path).to.contain("/magic-link/email-confirmed");
  });
});
