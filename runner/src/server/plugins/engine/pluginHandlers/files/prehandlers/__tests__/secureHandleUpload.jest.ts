import { secureHandleUpload } from "../secureHandleUpload";
import { handleUpload } from "../handleUpload";
import { HapiRequest, HapiResponseToolkit } from "src/server/types";

jest.mock("../handleUpload");

afterEach(() => {
  jest.clearAllMocks();
});

test("it supports unsecure file uploads", async () => {
  const request = buildRequest("form-id");
  const h = {} as HapiResponseToolkit;

  await secureHandleUpload(request, h);

  expect(handleUpload).toHaveBeenCalledWith(request, h, {
    url: undefined,
    additionalHeaders: undefined,
  });
});

test("it supports secure file uploads using fileUploadHmacSharedKey", async () => {
  const request = buildRequest("my-form", {
    fileUploadHmacSharedKey: "my-hmac-key",
  });
  const h = {} as HapiResponseToolkit;

  await secureHandleUpload(request, h);

  expect(handleUpload).toHaveBeenCalledWith(request, h, {
    url: undefined,
    additionalHeaders: {
      "X-Request-ID": expect.any(String),
      "X-HMAC-Signature": expect.any(String),
      "X-HMAC-Time": expect.any(String),
    },
  });
});

test("it supports secure file uploads using documentUploadApiUrl", async () => {
  const url = "http://example.com";
  const request = buildRequest("my-form", { documentUploadApiUrl: url });
  const h = {} as HapiResponseToolkit;

  await secureHandleUpload(request, h);

  expect(handleUpload).toHaveBeenCalledWith(request, h, {
    url: expect.stringMatching(url),
    additionalHeaders: undefined,
  });
});

const buildRequest = (
  formId: string,
  config?: { fileUploadHmacSharedKey?: string; documentUploadApiUrl?: string }
) => {
  const request = {
    params: {
      id: formId,
    },
    server: {
      app: {
        forms: {
          [formId]: {},
        },
      },
    },
    yar: {
      correlationId: "session-id",
    },
  };

  if (config) {
    request["server"]["app"]["forms"][formId]["def"] = {
      fileUploadHmacSharedKey: config.fileUploadHmacSharedKey,
      documentUploadApiUrl: config.documentUploadApiUrl,
    };
  }

  return request as unknown as HapiRequest;
};
