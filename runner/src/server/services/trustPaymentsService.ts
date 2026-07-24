import { createHash } from "crypto";
import {
  TrustPaymentsDetails,
  TrustPaymentsConfig,
} from "@xgovformbuilder/model";
import { HapiRequest } from "../types";
import { ControllerError } from "../plugins/engine/errors";

export class TrustPaymentsService {
  // private config: TrustPaymentsConfig;

  // constructor(config: TrustPaymentsConfig) {
  //   // this.config = config;
  // }

  async createTrustPaymentsForm(
    details: TrustPaymentsDetails,
    config: TrustPaymentsConfig
  ) {
    const currencyIso3a = "GBP";
    const mainAmount = details.mainAmount;
    const siteReference = config.siteReference;
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
      mainAmount +
      siteReference +
      version +
      siteSecurityTimestamp +
      config.hashPassword;

    const hash =
      "h" + createHash("sha256").update(stringToHash, "utf8").digest("hex");

    console.log("siteSecurityTimestamp ::", siteSecurityTimestamp);
    console.log("hash ::", hash);

    const html = `
        <html>
          <body>
            <form id="payform" method="POST" action="https://payments.securetrading.net/process/payments/details">
              <input type="hidden" name="sitereference" value="${siteReference}">
              <input type="hidden" name="currencyiso3a" value="${currencyIso3a}">
              <input type="hidden" name="mainamount" value="${mainAmount}">
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

    console.log("html:", html);

    return html;
  }

  verifyRedirect(request: HapiRequest): boolean {
    console.log("REQUEST PARAMS ::", JSON.stringify(request.params));

    const hashedReference = request.params["responsesitesecurity"];

    if (!hashedReference)
      throw new ControllerError(
        "invalid redirect structure from trust payments",
        {
          code: 500,
        }
      );

    // validate hash with our password
    const paramsInAlphabeticalOrder = Object.entries(request.params)
      // filter out the response site security value
      .filter(([paramKey]) => paramKey === "responsesitesecurity")
      .sort();

    // join all the params in a single string
    const paramString = paramsInAlphabeticalOrder
      .map(([, paramValue]) => paramValue)
      .join("");

    // hash the param string
    const hash = createHash("sha256").update(paramString, "utf8").digest("hex");

    return true; //hash === hashedReference;
  }
}
