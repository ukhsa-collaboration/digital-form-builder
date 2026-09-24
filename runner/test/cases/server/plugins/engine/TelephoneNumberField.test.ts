import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import { TelephoneNumberField } from "src/server/plugins/engine/components";
const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, describe, test } = lab;

const DEFAULT_MESSAGE = "Enter a telephone number in the correct format";
suite("Telephone number field", () => {
  describe("UK Validation", () => {
    const def = {
      name: "myComponent",
      title: "My component",
      hint: "a hint",
      options: {
        isUKOnly: true,
      },
    };
    const { schema } = new TelephoneNumberField(def, {});

    test("1. Success: Should validate a correct UK number", () => {
      expect(schema.validate("(020) 8738 9353").error).to.be.undefined();
      expect(schema.validate("+44 20 8738 9353").error).to.be.undefined();
      expect(schema.validate("02087389353").error).to.be.undefined();
    });

    test("2. Parsing error: Fails parseAndKeepRawInput", () => {
      // Invalid country calling code
      expect(schema.validate("+999 20 8738 935").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );

      // Not a number
      expect(schema.validate("+---").error.message).to.equal(
        "My component is not valid because the string supplied did not seem to be a phone number"
      );

      // Too short after IDD
      expect(schema.validate("0044-----").error.message).to.equal(
        "My component is not valid because phone number too short after IDD"
      );

      // Too short to parse
      expect(schema.validate("+44 0").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to parse
      expect(schema.validate("+44 20 8738 9353111111").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );
    });

    test("3. Not possible: fails isPossibleNumberWithReason", () => {
      // Too short to be possible
      expect(schema.validate("+44 20").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to be possible
      expect(schema.validate("+44 20 8738 93531").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );

      // Possible local only
      expect(schema.validate("+44 20 87").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+44 20 87").error.details[0].type).to.equal(
        "IS_POSSIBLE_LOCAL_ONLY"
      );
    });

    test("4. Invalid number: fails isValidNumber", () => {
      expect(schema.validate("+44791234567").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+44791234567").error.details[0].type).to.equal(
        "INVALID_NUMBER"
      );
    });

    test("5. Non UK number: getRegionCodeForNumber not in UK regions", () => {
      expect(schema.validate("+14155552671").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+14155552671").error.details[0].type).to.equal(
        "NON_UK_NUMBER"
      );
    });
  });

  describe("International Validation", () => {
    const def = {
      name: "myComponent",
      title: "My component",
      hint: "a hint",
      options: {
        isInternationalOnly: true,
      },
    };
    const { schema } = new TelephoneNumberField(def, {});

    test("1. Success: Should validate a correct number", () => {
      expect(schema.validate("+44 20 8738 9353").error).to.be.undefined();
    });

    test("2. Parsing error: Fails parseAndKeepRawInput", () => {
      // Invalid country calling code
      expect(schema.validate("+999 20 8738 935").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );
      expect(schema.validate("(020) 8738 9353").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );
      expect(schema.validate("02087389353").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );
      expect(schema.validate("0044-----").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );

      // Not a number
      expect(schema.validate("+---").error.message).to.equal(
        "My component is not valid because the string supplied did not seem to be a phone number"
      );

      // Too short to parse
      expect(schema.validate("+44 0").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to parse
      expect(schema.validate("+44 20 8738 9353111111").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );
    });

    test("3. Not possible: fails isPossibleNumberWithReason", () => {
      // Too short to be possible
      expect(schema.validate("+375 20").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to be possible
      expect(schema.validate("+61 20 8738 9353123").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );

      // Possible local only
      expect(schema.validate("+11 20 8712").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+11 20 8712").error.details[0].type).to.equal(
        "IS_POSSIBLE_LOCAL_ONLY"
      );

      // Invalid length
      expect(schema.validate("+61 20 8738 93531").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(
        schema.validate("+61 20 8738 93531").error.details[0].type
      ).to.equal("INVALID_LENGTH");
    });

    test("4. Invalid number: fails isValidNumber", () => {
      expect(schema.validate("+44791234567").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+44791234567").error.details[0].type).to.equal(
        "INVALID_NUMBER"
      );
    });
  });

  describe("UK and International Validation", () => {
    const def = {
      name: "myComponent",
      title: "My component",
      hint: "a hint",
      options: {},
    };
    const { schema } = new TelephoneNumberField(def, {});

    test("1. Success: Should validate a number", () => {
      expect(schema.validate("(020) 8738 9353").error).to.be.undefined();
      expect(schema.validate("+44 20 8738 9353").error).to.be.undefined();
      expect(schema.validate("02087389353").error).to.be.undefined();
      expect(schema.validate("+33-1-11-11-60-00").error).to.be.undefined();
    });

    test("2. Parsing error: Fails parseAndKeepRawInput", () => {
      // Invalid country calling code
      expect(schema.validate("+999 20 8738 935").error.message).to.equal(
        "My component is not valid because invalid country calling code"
      );

      // Not a number
      expect(schema.validate("+---").error.message).to.equal(
        "My component is not valid because the string supplied did not seem to be a phone number"
      );

      // Too short after IDD
      expect(schema.validate("0044-----").error.message).to.equal(
        "My component is not valid because phone number too short after IDD"
      );

      // Too short to parse
      expect(schema.validate("+44 0").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to parse
      expect(schema.validate("+44 20 8738 9353111111").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );
    });

    test("3. Not possible: fails isPossibleNumberWithReason", () => {
      // Too short to be possible
      expect(schema.validate("+44 20").error.message).to.equal(
        "My component is not valid because the string supplied is too short to be a phone number"
      );

      // Too long to be possible
      expect(schema.validate("+44 20 8738 93531").error.message).to.equal(
        "My component is not valid because the string supplied is too long to be a phone number"
      );

      // Possible local only
      expect(schema.validate("+44 20 87").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("+44 20 87").error.details[0].type).to.equal(
        "IS_POSSIBLE_LOCAL_ONLY"
      );

      // Invalid length
      expect(schema.validate("+61 20 8738 93531").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(
        schema.validate("+61 20 8738 93531").error.details[0].type
      ).to.equal("INVALID_LENGTH");
    });

    test("4. Invalid number: fails isValidNumber", () => {
      expect(schema.validate("0791234567").error.message).to.equal(
        DEFAULT_MESSAGE
      );
      expect(schema.validate("0791234567").error.details[0].type).to.equal(
        "INVALID_NUMBER"
      );
    });
  });

  describe("Custom validation messages", () => {
    const def = {
      name: "myComponent",
      title: "My component",
      hint: "a hint",
      options: {
        isUKOnly: true,
        customValidationMessages: {
          "string.empty": "Custom empty message",
          NON_UK_NUMBER: "Custom non uk number message",
        },
      },
    };
    const { schema } = new TelephoneNumberField(def, {});

    test("Should use custom validation messages if provided", () => {
      expect(schema.validate("").error.message).to.equal(
        "Custom empty message"
      );
      expect(schema.validate("+33-1-11-11-60-00").error.message).to.equal(
        "Custom non uk number message"
      );
    });

    test("Should use default telephone component messages if custom messages are not provided", () => {
      expect(schema.validate("abcdefg").error.message).to.equal(
        DEFAULT_MESSAGE
      );
    });
  });

  describe("Custom schema", () => {
    test("Should validate when schema options are supplied", () => {
      const def = {
        name: "myComponent",
        title: "My component",
        hint: "a hint",
        options: {
          customValidationMessages: {
            "string.min": "must be at least 2 characters long",
            "string.max": "must be at most 3 characters long",
            "string.pattern.base": "regex validation failed",
          },
        },
        schema: {
          min: 2,
          max: 3,
          regex: "A",
        },
      };
      const telephoneNumberField = new TelephoneNumberField(def, {});
      const { schema } = telephoneNumberField;

      expect(schema.validate("A").error.message).to.equal(
        "must be at least 2 characters long"
      );
      expect(schema.validate("AAAA").error.message).to.contain(
        "must be at most 3 characters long"
      );
      expect(schema.validate("B").error.message).to.contain(
        "regex validation failed"
      );
    });
  });

  describe("Autocomplete attribute", () => {
    test("Should add 'tel' to the autocomplete attribute", () => {
      const def = {
        name: "myComponent",
        title: "My component",
        hint: "a hint",
        options: {},
        schema: {},
      };
      const telephoneNumberField = new TelephoneNumberField(def, {});
      expect(telephoneNumberField.getViewModel({})).to.contain({
        autocomplete: "tel",
      });
    });
  });
});
