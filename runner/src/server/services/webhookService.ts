import { post, put } from "./httpService";
import { HapiServer } from "../types";

const DEFAULT_OPTIONS = {
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
  timeout: 60000,
};

export class WebhookService {
  logger: HapiServer["logger"];

  constructor(server: HapiServer) {
    this.logger = server.logger;
  }

  /**
   * Posts data to a webhook
   * @param url - url of the webhook
   * @param data - object to send to the webhook
   * @param method - POST or PUT request, defaults to POST
   * @param sendAdditionalPayMetadata - whether to include additional metadata in the request
   * @returns object with the property `reference` webhook if the response returns with a reference number. If the call fails, the reference will be 'UNKNOWN'.
   */
  async postRequest(
    url: string,
    data: object,
    method: "POST" | "PUT" = "POST",
    sendAdditionalPayMetadata: boolean = false,
    authHeaders?: Record<string, string>
  ): Promise<string> {
    let request = method === "POST" ? post : put;

    this.logger.warn(`WEBHOOK_SERVICE - REQUEST URL: ${url}`);

    const headers = {
      ...DEFAULT_OPTIONS.headers,
      ...(authHeaders || {}),
    };

    this.logger.warn(`WEBHOOK_SERVICE - HEADERS :: ${headers}`);
    this.logger.warn(
      `WEBHOOK_SERVICE - OPTIONS :: ${JSON.stringify(DEFAULT_OPTIONS)}`
    );

    try {
      if (!sendAdditionalPayMetadata) {
        delete data?.metadata?.pay;
      }

      const { payload, res } = await request(url, {
        ...DEFAULT_OPTIONS,
        headers: {
          ...DEFAULT_OPTIONS.headers,
          ...(authHeaders || {}),
        },
        payload: JSON.stringify(data),
      });

      if (typeof payload === "object" && !Buffer.isBuffer(payload)) {
        return payload.reference;
      }

      const Name = JSON.parse(payload)[0]?.Name;

      if (Name) {
        return Name;
      }

      this.logger.info(`Request status code: ${res.statusCode}`);

      const { reference } = JSON.parse(payload);

      this.logger.info(
        ["WebhookService", "postRequest"],
        `Webhook request to ${url} submitted OK`
      );

      return reference;
    } catch (error: any) {
      this.logger.error(["WebhookService", "postRequest"], error);
      return "UNKNOWN";
    }
  }
}
