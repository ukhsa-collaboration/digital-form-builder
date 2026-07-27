// @ts-nocheck

import { Schema } from "../schema";

const baseConfiguration = {
  metadata: {},
  startPage: "/first-page",
  pages: [],
  lists: [],
  sections: [],
  conditions: [],
  fees: [],
  outputs: [],
  version: 2,
  skipSummary: false,
  phaseBanner: {},
};

test("allows feedback URL to be an empty string when feedbackForm is false", () => {
  const goodConfiguration = {
    ...baseConfiguration,
    feedback: {
      feedbackForm: false,
      url: "",
    },
    name: "Schema fix 3",
  };

  const { value, error } = Schema.validate(goodConfiguration, {
    abortEarly: false,
  });

  expect(error).toEqual(undefined);
});

describe("payment configuration", () => {
  test("top level payment configurations (payApiKey, paymentReferenceFormat, payReturnUrl) are valid", () => {
    const configuration = {
      ...baseConfiguration,
      paymentReferenceFormat: "EGGS-",
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).toEqual(undefined);
  });

  test("feeOptions object creates itself from top level configurations if present", () => {
    const configuration = {
      ...baseConfiguration,
      paymentReferenceFormat: "EGGS-",
      payApiKey: "ab-cd",
    };

    const { value } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(value.paymentReferenceFormat).toEqual("EGGS-");
    expect(value.payApiKey).toEqual("ab-cd");

    expect(value.feeOptions).toEqual({
      paymentReferenceFormat: "EGGS-",
      payApiKey: "ab-cd",
    });
  });

  test("values can be configured via feeOptions", () => {
    const configuration = {
      ...baseConfiguration,
      feeOptions: {
        allowSubmissionWithoutPayment: false,
        maxAttempts: 10,
        paymentReferenceFormat: "EGGS-",
        payReturnUrl: "https://my.egg.service.scramble",
      },
    };

    const { value } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(value.feeOptions).toEqual({
      allowSubmissionWithoutPayment: false,
      maxAttempts: 10,
      paymentReferenceFormat: "EGGS-",
      payReturnUrl: "https://my.egg.service.scramble",
      showPaymentSkippedWarningPage: false,
    });
  });

  test("feeOptions are not overwritten by top level configuration", () => {
    const configuration = {
      ...baseConfiguration,
      paymentReferenceFormat: "FRIED-",
      feeOptions: {
        allowSubmissionWithoutPayment: true,
        maxAttempts: 3,
        paymentReferenceFormat: "EGGS-",
        payReturnUrl: "https://my.egg.service.scramble",
      },
    };

    const { value } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(value.feeOptions).toEqual({
      allowSubmissionWithoutPayment: true,
      maxAttempts: 3,
      paymentReferenceFormat: "EGGS-",
      payReturnUrl: "https://my.egg.service.scramble",
      showPaymentSkippedWarningPage: false,
    });
  });
});

describe("summaryConfig.feesRow", () => {
  test("is valid when enabled with no label", () => {
    const configuration = {
      ...baseConfiguration,
      summaryConfig: {
        feesRow: { enabled: true },
      },
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).toEqual(undefined);
  });

  test("is valid when enabled with a custom label", () => {
    const configuration = {
      ...baseConfiguration,
      summaryConfig: {
        feesRow: { enabled: true, label: "Delivery charge" },
      },
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).toEqual(undefined);
  });

  test("is invalid when enabled is missing", () => {
    const configuration = {
      ...baseConfiguration,
      summaryConfig: {
        feesRow: { label: "Delivery charge" },
      },
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).not.toEqual(undefined);
  });

  test("is invalid when enabled is not a boolean", () => {
    const configuration = {
      ...baseConfiguration,
      summaryConfig: {
        feesRow: { enabled: "yes" },
      },
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).not.toEqual(undefined);
  });

  test("is invalid when label is not a string", () => {
    const configuration = {
      ...baseConfiguration,
      summaryConfig: {
        feesRow: { enabled: true, label: 123 },
      },
    };

    const { error } = Schema.validate(configuration, {
      abortEarly: false,
    });

    expect(error).not.toEqual(undefined);
  });
});
