import { createHash, timingSafeEqual } from "crypto";
import {
  TrustPaymentsDetails,
  TrustPaymentsConfig,
} from "@xgovformbuilder/model";
import { HapiRequest } from "../types";
import { ControllerError } from "../plugins/engine/errors";
import { getOrCreateCorrelationId } from "../utils/correlationId";

type ServiceEventFunctions = Record<string, (request: HapiRequest) => void>;

const onInvalidPaymentFunctions: ServiceEventFunctions = {
  rpsRiskReportInvalidPayment: async (request: HapiRequest) => {
    const { cacheService, rpsBackendService } = request.service.getServices(
      "cacheService",
      "rpsBackendService"
    );

    const currentState = await cacheService.getState(request);

    await rpsBackendService.request("/storepayment", {
      method: "POST",
      body: JSON.stringify({
        uuid: currentState["sessionId"],
        transactionId: "txn-789",
        settle_status: "NOT_SETTLED",
      }),
    });
  },
};

const onValidPaymentFunctions: ServiceEventFunctions = {
  rpsRiskReportValidPayment: async (request: HapiRequest) => {
    const { rpsBackendService } = request.service.getServices(
      "cacheService",
      "rpsBackendService"
    );

    await rpsBackendService.request("/storepayment", {
      method: "POST",
      body: JSON.stringify({
        uuid: getOrCreateCorrelationId(request),
        transactionId: "txn-789",
        settle_status: "SETTLED",
      }),
    });
  },
};

export class TrustPaymentsService {
  private config: TrustPaymentsConfig;

  constructor(config: TrustPaymentsConfig) {
    this.config = config;
  }

  async onInvalidPayment(request: HapiRequest) {
    if (!this.config.onInvalidPaymentFunction) return;

    const onInvalidPaymentFunction =
      onInvalidPaymentFunctions[this.config.onInvalidPaymentFunction];

    if (!onInvalidPaymentFunction && this.config.onInvalidPaymentFunction) {
      throw new ControllerError("cannot find onInvalidPayment function", {
        code: 500,
      });
    }

    await onInvalidPaymentFunction(request);
  }

  async onValidPayment(request: HapiRequest) {
    if (!this.config.onValidPaymentFunction) return;

    const onValidPaymentFunction =
      onValidPaymentFunctions[this.config.onValidPaymentFunction];

    if (!onValidPaymentFunction && this.config.onValidPaymentFunction) {
      throw new ControllerError("cannot find onValidPayment function", {
        code: 500,
      });
    }

    await onValidPaymentFunction(request);
  }

  async createTrustPaymentsForm(details: TrustPaymentsDetails) {
    const currencyIso3a = "GBP";
    const amount = details.amount / 100;
    const siteReference = this.config.siteReference;
    const version = 2;
    const billingFirstName = details.billingFirstName;
    const billingLastName = details.billingLastName;
    const successfulUrlRedirect = details.redirectUrl;

    // current time minus 2 minutes
    const date = new Date(Date.now() - 2 * 60 * 1000);

    const siteSecurityTimestamp = date
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);

    const stringToHash =
      currencyIso3a +
      amount +
      siteReference +
      version +
      siteSecurityTimestamp +
      this.config.hashPassword;

    const hash =
      "h" + createHash("sha256").update(stringToHash, "utf8").digest("hex");

    const html = `
        <html>
          <body>
            <form id="payform" method="POST" action="https://payments.securetrading.net/process/payments/details">
              <input type="hidden" name="sitereference" value="${siteReference}">
              <input type="hidden" name="currencyiso3a" value="${currencyIso3a}">
              <input type="hidden" name="mainamount" value="${amount}">
              <input type="hidden" name="billingfirstname" value="${billingFirstName}">
              <input type="hidden" name="billinglastname" value="${billingLastName}">
              <input type="hidden" name="strequiredfields" value="billingfirstname">
              <input type="hidden" name="strequiredfields" value="billinglastname">
              <input type="hidden" name="ruleidentifier" value="STR-6">
              <input type="hidden" name="successfulurlredirect" value="${successfulUrlRedirect}">
              <input type="hidden" name="version" value="${version}">
              <input type="hidden" name="stprofile" value="default">
              <input type="hidden" name="stdefaultprofile" value="st_cardonly">
              <input type="hidden" name="sitesecurity" value="${hash}">
              <input type="hidden" name="sitesecuritytimestamp" value="${siteSecurityTimestamp}">
            </form>

            <script>
              document.getElementById("payform").submit()
            </script>
          </body>
        </html>
    `;

    return html;
  }

  verifyRedirect(request: HapiRequest): boolean {
    const hashedReference = request.query["responsesitesecurity"];

    if (!hashedReference)
      throw new ControllerError(
        "invalid redirect structure from trust payments",
        {
          code: 500,
        }
      );

    // validate hash with our password
    const paramsInAlphabeticalOrder = Object.entries(request.query)
      // filter out the response site security value
      .filter(([paramKey]) => paramKey !== "responsesitesecurity")
      .sort(([a], [b]) => a.localeCompare(b));

    // join all the params in a single string
    const paramString =
      paramsInAlphabeticalOrder.map(([, paramValue]) => paramValue).join("") +
      this.config.hashPassword;

    // hash the param string
    const hash = createHash("sha256").update(paramString, "utf8").digest("hex");

    // Make sure the comparison is timing safe
    const hashBuffer = new Uint8Array(Buffer.from(hash));
    const hashedReferenceBuffer = new Uint8Array(Buffer.from(hashedReference));

    if (hashBuffer.length !== hashedReferenceBuffer.length) return false;

    return timingSafeEqual(hashBuffer, hashedReferenceBuffer);
  }
}
