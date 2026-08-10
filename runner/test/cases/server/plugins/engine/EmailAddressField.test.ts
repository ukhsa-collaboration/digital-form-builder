import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import {
  EmailAddressField,
  EMAIL_REGEX,
} from "src/server/plugins/engine/components/EmailAddressField";

const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, test } = lab;

suite("Email address field", () => {
  test("Should add 'email' to the autocomplete attribute", () => {
    const def = {
      name: "myComponent",
      title: "My component",
      hint: "a hint",
      options: {},
      schema: {},
    };

    const emailAddressField = new EmailAddressField(def, {});
    expect(emailAddressField.getViewModel({})).to.contain({
      autocomplete: "email",
    });
  });

  test("Should accept valid emails", () => {
    const validEmails = [
      "o'brien@example.com",
      "mary.o'connor@example.co.uk",
      "d'angelo123@sub.domain.org",
      "test.email+alex@leetcode.com",
      "user_name@example-domain.com",
      "x@example.io",
      "user@domain",
      "..abc@outlook.com",
    ];

    const regex = new RegExp(EMAIL_REGEX);

    let checkedValidEmails = 0;
    validEmails.forEach((email) => {
      checkedValidEmails++;
      expect(regex.test(email), email).to.be.true();
    });
    expect(checkedValidEmails).to.equal(validEmails.length);
  });

  test("Should reject invalid emails", () => {
    const invalidEmails = [
      "plainaddress",
      "@missinglocal.com",
      "missingatsign.com",
      "user@.com",
      "user@domain..com",
      "user@-domain.com",
      "user@do'main.com",
    ];

    const regex = new RegExp(EMAIL_REGEX);

    let checkedInvalidEmails = 0;
    invalidEmails.forEach((email) => {
      checkedInvalidEmails++;
      expect(regex.test(email), email).to.be.false();
    });
    expect(checkedInvalidEmails).to.equal(invalidEmails.length);
  });
});
