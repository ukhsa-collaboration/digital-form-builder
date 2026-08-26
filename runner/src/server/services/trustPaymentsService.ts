import { createHash, timingSafeEqual } from "crypto";
import {
  TrustPaymentsDetails,
  TrustPaymentsConfig,
} from "@xgovformbuilder/model";
import { HapiRequest } from "../types";
import { ControllerError } from "../plugins/engine/errors";
import { BaseService } from "./BaseService";

export class TrustPaymentsService extends BaseService {
  private config: TrustPaymentsConfig;

  constructor(_, config: TrustPaymentsConfig) {
    super("TrustPaymentsService");
    this.config = config;
  }

  async createTrustPaymentsForm(details: TrustPaymentsDetails) {
    this.logger.trace(
      { amount: details.amount, siteReference: this.config.siteReference },
      "createTrustPaymentsForm called"
    );

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

    this.logger.trace(
      { siteReference, siteSecurityTimestamp },
      "trust payments form generated"
    );

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
    this.logger.trace("verifyRedirect called");

    const hashedReference = request.query["responsesitesecurity"];

    if (!hashedReference) {
      this.logger.trace("responsesitesecurity missing from redirect query");
      throw new ControllerError(
        "invalid redirect structure from trust payments",
        {
          code: 500,
        }
      );
    }

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

    if (hashBuffer.length !== hashedReferenceBuffer.length) {
      this.logger.trace("hash length mismatch, redirect verification failed");
      return false;
    }

    const valid = timingSafeEqual(hashBuffer, hashedReferenceBuffer);

    this.logger.trace({ valid }, "verifyRedirect result");

    return valid;
  }
}
