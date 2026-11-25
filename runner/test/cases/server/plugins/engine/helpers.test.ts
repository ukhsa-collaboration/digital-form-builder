import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import Joi from "joi";
import {
  getBackLink,
  getReturnUrl,
  getTimeoutParams,
  getTimeoutParamsFromState,
  getValidStateFromQueryParameters,
  idFromFilename,
  nonRelativeRedirectUrl,
  normalizeUrlPath,
  proceed,
  redirectTo,
  redirectUrl,
  toQueryString,
} from "../../../../../src/server/plugins/engine/helpers";

const lab = Lab.script();

exports.lab = lab;

const { expect } = Code;
const { beforeEach, describe, suite, test } = lab;

suite("Helpers", () => {
  describe("proceed", () => {
    let h;
    const returnValue = "";
    beforeEach(() => {
      h = {
        redirect: sinon.stub(),
      };
      h.redirect.returns(returnValue);
    });

    test("Should redirect to the returnUrl if one is provided", () => {
      const returnUrl = "/my-return-url";
      const request = {
        query: {
          returnUrl: returnUrl,
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(returnUrl);
      expect(returned).to.equal(returnValue);
    });

    test("Should redirect to next url when no query params", () => {
      const request = {
        query: {},
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(nextUrl);
      expect(returned).to.equal(returnValue);
    });

    test("Should redirect to next url ignoring most params from original request", () => {
      const request = {
        query: {
          myParam: "myValue",
          myParam2: "myValue2",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}`);
      expect(returned).to.equal(returnValue);
    });

    test("Should copy feedback param from the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}?f_t=myValue`);
      expect(returned).to.equal(returnValue);
    });

    test("Should use params provided in nextUrl in preference to those in the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys?f_t=newValue";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}`);
      expect(returned).to.equal(returnValue);
    });

    test("Should redirect to next url (not returnUrl) when honourReturnUrl is false, carrying returnUrl forward for a later step to honour", () => {
      const returnUrl = "/my-return-url";
      const request = {
        query: {
          returnUrl: returnUrl,
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl, false);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(
        `${nextUrl}?returnUrl=%2Fmy-return-url`
      );
      expect(returned).to.equal(returnValue);
    });

    test("Should not redirect to a protocol-relative returnUrl (open redirect)", () => {
      const request = {
        query: {
          returnUrl: "//evil.example.com",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = proceed(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      // Not honoured as an immediate redirect target - falls through to
      // redirectTo, which carries the (still-unsafe) value forward as a
      // query param rather than ever passing it to h.redirect directly.
      expect(h.redirect.firstCall.args[0]).to.equal(
        `${nextUrl}?returnUrl=%2F%2Fevil.example.com`
      );
      expect(returned).to.equal(returnValue);
    });
  });

  describe("redirectTo", () => {
    let h;
    const returnValue = "";
    beforeEach(() => {
      h = {
        redirect: sinon.stub(),
      };
      h.redirect.returns(returnValue);
    });

    test("Should redirect to next url when no query params in the request", () => {
      const request = {
        query: {},
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectTo(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(nextUrl);
      expect(returned).to.equal(returnValue);
    });

    test("Should redirect to next url ignoring most params from original request", () => {
      const request = {
        query: {
          myParam: "myValue",
          myParam2: "myValue2",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectTo(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}`);
      expect(returned).to.equal(returnValue);
    });

    test("Should copy feedback param from the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectTo(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}?f_t=myValue`);
      expect(returned).to.equal(returnValue);
    });

    test("Should use params provided in nextUrl in preference to those in the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys?f_t=newValue";
      const returned = redirectTo(request, h, nextUrl);

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}`);
      expect(returned).to.equal(returnValue);
    });

    test("Should set params from params object", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectTo(request, h, nextUrl, {
        returnUrl: "/myreturnurl",
        badger: "monkeys",
      });

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(
        `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys&f_t=myValue`
      );
      expect(returned).to.equal(returnValue);
    });

    test("Should use params provided in params object in preference to those in the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectTo(request, h, nextUrl, { f_t: "newValue" });

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(`${nextUrl}?f_t=newValue`);
      expect(returned).to.equal(returnValue);
    });

    test("Should redirect to absolute url as provided without any adulteration", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "http://www.example.com/monkeys";
      const returned = redirectTo(request, h, nextUrl, { f_t: "newValue" });

      expect(h.redirect.callCount).to.equal(1);
      expect(h.redirect.firstCall.args[0]).to.equal(nextUrl);
      expect(returned).to.equal(returnValue);
    });
  });

  describe("redirectUrl", () => {
    test("Should return target url when no query params in the request", () => {
      const request = {
        query: {},
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectUrl(request, nextUrl);

      expect(returned).to.equal(nextUrl);
    });

    test("Should return target url ignoring most params from original request", () => {
      const request = {
        query: {
          myParam: "myValue",
          myParam2: "myValue2",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectUrl(request, nextUrl);

      expect(returned).to.equal(nextUrl);
    });

    test("Should copy feedback param from the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectUrl(request, nextUrl);

      expect(returned).to.equal(`${nextUrl}?f_t=myValue`);
    });

    test("Should use params provided in nextUrl in preference to those in the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys?f_t=newValue";
      const returned = redirectUrl(request, nextUrl);

      expect(returned).to.equal(nextUrl);
    });

    test("Should set params from params object", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectUrl(request, nextUrl, {
        returnUrl: "/myreturnurl",
        badger: "monkeys",
      });

      expect(returned).to.equal(
        `${nextUrl}?returnUrl=%2Fmyreturnurl&badger=monkeys&f_t=myValue`
      );
    });

    test("Should use params provided in params object in preference to those in the original request", () => {
      const request = {
        query: {
          f_t: "myValue",
        },
      };
      const nextUrl = "badgers/monkeys";
      const returned = redirectUrl(request, nextUrl, { f_t: "newValue" });
      expect(returned).to.equal(`${nextUrl}?f_t=newValue`);
    });
  });

  describe("nonRelativeRedirectUrl", () => {
    test("Should return non-relative url with correct query parameters", () => {
      const request = {
        query: {
          visit: "123",
          f_t: "true",
          ignored: true,
        },
      };
      const nextUrl = "https://test.com";
      const url = nonRelativeRedirectUrl(request, nextUrl);
      expect(url).to.equal("https://test.com/?f_t=true");
    });
  });

  describe("getValidStateFromQueryParameters", () => {
    test("Should return an empty object if none of the query parameters relate to valid fields for pre-population", () => {
      const query = {
        aBadQueryParam: "A value",
      };
      const prePopFields = {
        eggType: {
          schema: Joi.string().required(),
        },
      };
      expect(
        Object.keys(getValidStateFromQueryParameters(prePopFields, query))
          .length
      ).to.equal(0);
    });

    test("Should return an empty object when a query parameter is valid, but a value already exists in the form state", () => {
      const query = {
        aBadQueryParam: "A value",
        eggType: "Hard boiled",
      };
      const prePopFields = {
        eggType: {
          schema: Joi.string().required(),
        },
      };
      const state = {
        eggType: "Fried",
      };

      expect(
        Object.keys(
          getValidStateFromQueryParameters(prePopFields, query, state)
        ).length
      ).to.equal(0);
    });

    test("Should allow the value to be overwritten if allowPrePopulationOverwrite is true", () => {
      const query = {
        eggType: "Hard boiled",
      };
      const prePopFields = {
        eggType: {
          schema: Joi.string().required(),
          allowPrePopulationOverwrite: true,
        },
      };
      const state = {
        eggType: "Fried",
      };

      expect(
        getValidStateFromQueryParameters(prePopFields, query, state)
      ).to.equal({ eggType: "Hard boiled" });
    });

    test("Should be able to update nested object values", () => {
      const query = {
        "yourEggs.eggType": "Fried egg",
      };
      const prePopFields = {
        yourEggs: {
          eggType: {
            schema: Joi.string().required(),
          },
        },
      };
      expect(
        getValidStateFromQueryParameters(prePopFields, query).yourEggs.eggType
      ).to.equal("Fried egg");
    });

    test("Should reject a value if it fails validation", () => {
      const query = {
        "yourEggs.eggType": "deviled",
      };
      const prePopFields = {
        yourEggs: {
          eggType: {
            schema: Joi.string().valid("boiled", "fried", "poached"),
          },
        },
      };
      expect(
        Object.keys(getValidStateFromQueryParameters(prePopFields, query))
          .length
      ).to.equal(0);
    });
  });

  describe("getTimeoutParams", () => {
    const prePopFields = {
      r: { schema: Joi.string().required() },
      d: { schema: Joi.string().valid("01F0", "01F2") },
      other: { schema: Joi.string() },
    };

    test("Should return only r and d from the query", () => {
      expect(
        getTimeoutParams(prePopFields, {
          r: "abc000",
          d: "01F2",
          other: "ignored",
          unknown: "ignored",
        })
      ).to.equal({ r: "abc000", d: "01F2" });
    });

    test("Should drop values that fail validation or are not strings", () => {
      expect(
        getTimeoutParams(prePopFields, { r: ["a", "b"], d: "not-a-disease" })
      ).to.equal({});
    });

    test("Should ignore r and d when they are not pre-population fields", () => {
      expect(
        getTimeoutParams({ other: { schema: Joi.string() } }, { r: "abc000" })
      ).to.equal({});
    });

    test("Should return an empty object for an empty query", () => {
      expect(getTimeoutParams(prePopFields, {})).to.equal({});
    });
  });

  describe("getTimeoutParamsFromState", () => {
    const prePopFields = {
      r: { schema: Joi.string() },
      d: { schema: Joi.string() },
      other: { schema: Joi.string() },
    };

    test("Should return r and d held in the form state", () => {
      expect(
        getTimeoutParamsFromState(prePopFields, {
          r: "abc000",
          d: "01F2",
          other: "ignored",
        })
      ).to.equal({ r: "abc000", d: "01F2" });
    });

    test("Should ignore empty and non-string values", () => {
      expect(
        getTimeoutParamsFromState(prePopFields, { r: "", d: 12 })
      ).to.equal({});
    });

    test("Should ignore state for keys that are not pre-population fields", () => {
      expect(
        getTimeoutParamsFromState(
          { other: { schema: Joi.string() } },
          { r: "abc000" }
        )
      ).to.equal({});
    });
  });

  describe("toQueryString", () => {
    test("Should encode values", () => {
      expect(toQueryString({ r: "a b&c", d: "01F2" })).to.equal(
        "r=a+b%26c&d=01F2"
      );
    });

    test("Should return an empty string when there are no params", () => {
      expect(toQueryString({})).to.equal("");
    });
  });

  describe("getReturnUrl", () => {
    test("Should return the returnUrl when it is present and internal", () => {
      const request = { query: { returnUrl: "/summary" } };
      expect(getReturnUrl(request)).to.equal("/summary");
    });

    test("Should return undefined when returnUrl is missing", () => {
      const request = { query: {} };
      expect(getReturnUrl(request)).to.equal(undefined);
    });

    test("Should return undefined when returnUrl does not start with /", () => {
      const request = { query: { returnUrl: "https://evil.example.com" } };
      expect(getReturnUrl(request)).to.equal(undefined);
    });

    test("Should return undefined when returnUrl is protocol-relative (open redirect)", () => {
      const request = { query: { returnUrl: "//evil.example.com" } };
      expect(getReturnUrl(request)).to.equal(undefined);
    });
  });

  describe("getBackLink", () => {
    test("Should normalize leading and trailing slashes when matching progress", () => {
      const request = {
        path: "/path/",
        url: { search: "" },
        query: {},
      };

      expect(getBackLink(request, ["previous", "path/"], "/fallback")).to.equal(
        "/previous"
      );
    });

    test("Should preserve query strings when normalizing paths", () => {
      ["/path", "path", "path/"].forEach((path) => {
        expect(normalizeUrlPath(path)).to.equal("/path");
      });
      expect(normalizeUrlPath("path/?view=summary")).to.equal(
        "/path?view=summary"
      );
    });

    test("Should use returnUrl when it is present and internal", () => {
      const request = { query: { returnUrl: "/summary" } };
      expect(getBackLink(request, ["/a", "/b"], "/fallback")).to.equal(
        "/summary"
      );
    });

    test("Should fall back to progress history when returnUrl is protocol-relative (open redirect)", () => {
      const request = { query: { returnUrl: "//evil.example.com" } };
      expect(getBackLink(request, ["/a", "/b"], "/fallback")).to.equal("/a");
    });

    test("Should use the last progress entry when the current page is not tracked", () => {
      const request = {
        path: "/your-details",
        url: { search: "" },
        query: {},
      };
      expect(
        getBackLink(request, ["/previous-test-action-level"], "/fallback")
      ).to.equal("/previous-test-action-level");
    });

    test("Should skip the current page when it is already tracked", () => {
      const request = {
        path: "/your-details",
        url: { search: "" },
        query: {},
      };
      expect(
        getBackLink(
          request,
          ["/previous-test-action-level", "/your-details"],
          "/fallback"
        )
      ).to.equal("/previous-test-action-level");
    });

    test("Should not cycle when history has been truncated to the current page", () => {
      const request = {
        path: "/previous-test-action-level",
        url: { search: "" },
        query: {},
      };

      expect(
        getBackLink(request, ["/previous-test-action-level"], "/fallback")
      ).to.equal("/fallback");
    });
  });

  describe("idFromFilename", () => {
    test("strips .json extension", () => {
      expect(idFromFilename("my-form.json")).to.equal("my-form");
    });

    test("strips .jsonc extension", () => {
      expect(idFromFilename("my-form.jsonc")).to.equal("my-form");
    });

    test("strips govsite. prefix and .json extension", () => {
      expect(idFromFilename("govsite.my-form.json")).to.equal("my-form");
    });

    test("strips govsite. prefix and .jsonc extension", () => {
      expect(idFromFilename("govsite.my-form.jsonc")).to.equal("my-form");
    });
  });
});
