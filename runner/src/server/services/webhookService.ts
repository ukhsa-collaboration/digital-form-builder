import { post, put } from "./httpService";
import { HapiServer } from "../types";
import client from "prom-client";
import register from "server/plugins/promRegistry";

const DEFAULT_OPTIONS = {
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
  timeout: 60000,
};

const webhookSuccessCounter = new client.Counter({
  name: "successful_submissions_total",
  help: "Total number of successful submissions",
  labelNames: ["reference"],
});

register.registerMetric(webhookSuccessCounter);

const webhookFailureCounter = new client.Counter({
  name: "failed_submissions_total",
  help: "Total number of failed submissions",
  labelNames: ["reference"],
});

register.registerMetric(webhookFailureCounter);

export class WebhookService {
  logger: any;
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
    sendAdditionalPayMetadata: boolean = false
  ) {
    this.logger.info(
      ["WebhookService", "postRequest body"],
      JSON.stringify(data)
    );
    let request = method === "POST" ? post : put;
    try {
      if (!sendAdditionalPayMetadata) {
        delete data?.metadata?.pay;
      }
      const { payload } = await request(url, {
        ...DEFAULT_OPTIONS,
        payload: JSON.stringify(data),
      });

      this.logger.info(
        [payload, typeof payload, payload.reference],
        "payload line 64"
      );

      if (typeof payload === "object" && !Buffer.isBuffer(payload)) {
        return payload.reference;
      }
      const { reference } = JSON.parse(payload);
      this.logger.info(
        ["WebhookService", "postRequest"],
        `Webhook request to ${url} submitted OK`
      );
      this.logger.debug(
        ["WebhookService", "postRequest", "testing", `REF: ${reference}`],
        JSON.stringify(payload)
      );

      webhookSuccessCounter.inc({
        reference: `${reference}`,
      });

      return reference;
    } catch (error) {
      this.logger.error(["WebhookService", "postRequest", "testing"], error);

      webhookFailureCounter.inc({
        reference: "UNKNOWN",
      });

      return "UNKNOWN";
    }
  }
}
