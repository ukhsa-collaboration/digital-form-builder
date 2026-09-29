import { summaryContentToSummaryLists } from "../summaryContentToSummaryLists";

describe("summaryContentToSummaryLists", () => {
  describe("cards", () => {
    it("adds card.title when enableCards is 'true' string", () => {
      const result = summaryContentToSummaryLists(
        [{ title: "My Section", content: [] }],
        {},
        { enableCards: "true" }
      );
      expect(result[0].card).toEqual({ title: { text: "My Section" } });
    });

    it("adds card.title when enableCards is boolean true", () => {
      const result = summaryContentToSummaryLists(
        [{ title: "My Section", content: [] }],
        {},
        { enableCards: true }
      );
      expect(result[0].card).toEqual({ title: { text: "My Section" } });
    });

    it("omits card when enableCards is false", () => {
      const result = summaryContentToSummaryLists(
        [{ title: "My Section", content: [] }],
        {},
        { enableCards: false }
      );
      expect(result[0].card).toBeUndefined();
    });

    it("omits card when enableCards is not provided", () => {
      const result = summaryContentToSummaryLists(
        [{ title: "My Section", content: [] }],
        {}
      );
      expect(result[0].card).toBeUndefined();
    });
  });

  describe("change links", () => {
    it("includes actions when changeUrl is a string", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Age", value: "38", changeUrl: "/age" }],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions).toEqual({
        items: [
          {
            href: "/age?returnUrl=%2Fsummary",
            text: "Change",
            visuallyHiddenText: "age",
          },
        ],
      });
    });

    it("appends a returnUrl query param pointing back to the summary page", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Age", value: "38", changeUrl: "/age" }],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/age?returnUrl=%2Fsummary"
      );
    });

    it("omits actions when changeUrl is false", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              { title: "Type", value: "Gas test kit", changeUrl: false },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions).toBeUndefined();
    });

    it("lowercases the visuallyHiddenText", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              { title: "First Name", value: "Alice", changeUrl: "/name" },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions?.items[0].visuallyHiddenText).toBe(
        "first name"
      );
    });

    it("prefixes the href with the form's basePath when provided", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Age", value: "38", changeUrl: "/age" }],
          },
        ],
        {},
        {},
        {},
        "my-form"
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/my-form/age?returnUrl=%2Fmy-form%2Fsummary"
      );
    });

    it("leaves the href unprefixed when basePath is not provided", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Age", value: "38", changeUrl: "/age" }],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/age?returnUrl=%2Fsummary"
      );
    });
  });

  describe("conditional change links", () => {
    it("uses the matching condition's url when the condition evaluates true", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [
                  { condition: "A", value: "/a" },
                  { value: "/default" },
                ],
              },
            ],
          },
        ],
        {},
        {},
        { A: { fn: () => true } }
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/a?returnUrl=%2Fsummary"
      );
    });

    it("falls through to the unconditional default when the condition evaluates false", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [
                  { condition: "A", value: "/a" },
                  { value: "/default" },
                ],
              },
            ],
          },
        ],
        {},
        {},
        { A: { fn: () => false } }
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/default?returnUrl=%2Fsummary"
      );
    });

    it("evaluates cases in order and stops at the first match", () => {
      const bFn = jest.fn(() => true);
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [
                  { condition: "A", value: "/a" },
                  { condition: "B", value: "/b" },
                  { value: "/default" },
                ],
              },
            ],
          },
        ],
        {},
        {},
        { A: { fn: () => true }, B: { fn: bFn } }
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/a?returnUrl=%2Fsummary"
      );
      expect(bFn).not.toHaveBeenCalled();
    });

    it("omits actions when no case matches and there is no unconditional fallback", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [{ condition: "A", value: "/a" }],
              },
            ],
          },
        ],
        {},
        {},
        { A: { fn: () => false } }
      );
      expect(result[0].rows[0].actions).toBeUndefined();
    });

    it("omits actions when changeUrl is an empty array", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Address", value: "1 Main St", changeUrl: [] }],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions).toBeUndefined();
    });

    it("treats an unknown/missing condition name as non-matching and continues to the next case", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [
                  { condition: "TypoName", value: "/a" },
                  { value: "/default" },
                ],
              },
            ],
          },
        ],
        {},
        {},
        {}
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/default?returnUrl=%2Fsummary"
      );
    });

    it("passes the current state into the condition's fn", () => {
      const fn = jest.fn(() => true);
      const state = { foo: "bar" };
      summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                value: "1 Main St",
                changeUrl: [{ condition: "A", value: "/a" }],
              },
            ],
          },
        ],
        state,
        {},
        { A: { fn } }
      );
      expect(fn).toHaveBeenCalledWith(state);
    });

    it("existing string changeUrl behavior is unaffected when conditions argument is omitted", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [{ title: "Age", value: "38", changeUrl: "/age" }],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions?.items[0].href).toBe(
        "/age?returnUrl=%2Fsummary"
      );
    });

    it("existing false changeUrl behavior is unaffected when conditions argument is omitted", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              { title: "Type", value: "Gas test kit", changeUrl: false },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].actions).toBeUndefined();
    });
  });

  describe("string value rendering", () => {
    it("renders plain string as html", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Kit",
                value: "Home radon gas test kit",
                changeUrl: false,
              },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].value).toEqual({
        html: "Home radon gas test kit",
      });
    });

    it("renders nunjucks template string against state", () => {
      const state = {
        personalDetails: { firstName: "Alice", lastName: "Smith" },
      };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Name",
                value:
                  "{{personalDetails.firstName}} {{personalDetails.lastName}}",
                changeUrl: false,
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].value).toEqual({ html: "Alice Smith" });
    });
  });

  describe("component type: DisplayAddress", () => {
    it("produces a valueComponent view model for the template to render", () => {
      const state = {
        propertyAddress_selectedAddress: {
          address: "10 Downing Street, London, SW1A 2AA",
        },
      };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Property address",
                type: "component",
                value: {
                  name: "displayPropertyAddress",
                  type: "DisplayAddress",
                  content: "{{propertyAddress_selectedAddress.address}}",
                },
                changeUrl: "/change-address",
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].valueComponent).toEqual({
        type: "DisplayAddress",
        isFormComponent: false,
        model: {
          content: "10 Downing Street, London, SW1A 2AA",
          attributes: {},
        },
      });
    });

    it("sets attributes.inset when the inset option is true", () => {
      const state = { addr: "10 Downing Street, London, SW1A 2AA" };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Property address",
                type: "component",
                value: {
                  name: "displayPropertyAddress",
                  type: "DisplayAddress",
                  options: { inset: true },
                  content: "{{addr}}",
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].valueComponent?.model.attributes).toEqual({
        inset: true,
      });
    });
  });

  describe("conditional component content", () => {
    it("uses the matching condition's value when the condition evaluates true", () => {
      const state = {
        propertyAddress_fullSelectedAddress: "10 Downing Street",
        kitAddress_fullSelectedAddress: "22 Baker Street",
      };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "displayKitAddress",
                  type: "DisplayAddress",
                  content: [
                    {
                      condition: "DeliveryAddressIncorrect",
                      value: "{{propertyAddress_fullSelectedAddress}}",
                    },
                    { value: "{{kitAddress_fullSelectedAddress}}" },
                  ],
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state,
        {},
        { DeliveryAddressIncorrect: { fn: () => true } }
      );
      expect(result[0].rows[0].valueComponent?.model.content).toBe(
        "10 Downing Street"
      );
    });

    it("falls through to the unconditional default when the condition evaluates false", () => {
      const state = {
        propertyAddress_fullSelectedAddress: "10 Downing Street",
        kitAddress_fullSelectedAddress: "22 Baker Street",
      };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "displayKitAddress",
                  type: "DisplayAddress",
                  content: [
                    {
                      condition: "DeliveryAddressIncorrect",
                      value: "{{propertyAddress_fullSelectedAddress}}",
                    },
                    { value: "{{kitAddress_fullSelectedAddress}}" },
                  ],
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state,
        {},
        { DeliveryAddressIncorrect: { fn: () => false } }
      );
      expect(result[0].rows[0].valueComponent?.model.content).toBe(
        "22 Baker Street"
      );
    });

    it("returns empty string when no case matches and there is no unconditional fallback", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "displayKitAddress",
                  type: "DisplayAddress",
                  content: [{ condition: "A", value: "some address" }],
                },
                changeUrl: false,
              },
            ],
          },
        ],
        {},
        {},
        { A: { fn: () => false } }
      );
      expect(result[0].rows[0].valueComponent?.model.content).toBe("");
    });

    it("passes the current state into the condition fn", () => {
      const fn = jest.fn(() => true);
      const state = { foo: "bar" };
      summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "displayKitAddress",
                  type: "DisplayAddress",
                  content: [{ condition: "A", value: "x" }],
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state,
        {},
        { A: { fn } }
      );
      expect(fn).toHaveBeenCalledWith(state);
    });

    it("plain string content is unaffected when conditions argument is omitted", () => {
      const state = { addr: "1 Main St" };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "displayKitAddress",
                  type: "DisplayAddress",
                  content: "{{addr}}",
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].valueComponent?.model.content).toBe("1 Main St");
    });
  });

  describe("component type: DatePartsField", () => {
    it("formats ISO date as 'd MMMM yyyy'", () => {
      const state = { myDate: "2026-08-07" };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Date",
                type: "component",
                value: { name: "myDate", type: "DatePartsField", content: "" },
                changeUrl: false,
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].value).toEqual({ text: "7 August 2026" });
    });

    it("returns empty string when state value is missing", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Date",
                type: "component",
                value: { name: "myDate", type: "DatePartsField", content: "" },
                changeUrl: false,
              },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].value).toEqual({ text: "" });
    });
  });

  describe("component type: UkAddressField", () => {
    it("joins address parts filtering empty values", () => {
      const state = {
        myAddress: {
          addressLine1: "10 Downing Street",
          addressLine2: "",
          town: "London",
          postcode: "SW1A 2AA",
        },
      };
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "myAddress",
                  type: "UkAddressField",
                  content: "",
                },
                changeUrl: false,
              },
            ],
          },
        ],
        state
      );
      expect(result[0].rows[0].value).toEqual({
        text: "10 Downing Street, London, SW1A 2AA",
      });
    });

    it("returns empty string when state value is missing", () => {
      const result = summaryContentToSummaryLists(
        [
          {
            title: "Section",
            content: [
              {
                title: "Address",
                type: "component",
                value: {
                  name: "myAddress",
                  type: "UkAddressField",
                  content: "",
                },
                changeUrl: false,
              },
            ],
          },
        ],
        {}
      );
      expect(result[0].rows[0].value).toEqual({ text: "" });
    });
  });

  describe("multiple sections", () => {
    it("returns one entry per section", () => {
      const result = summaryContentToSummaryLists(
        [
          { title: "Section A", content: [] },
          { title: "Section B", content: [] },
        ],
        {}
      );
      expect(result).toHaveLength(2);
    });
  });
});
