import config from "../config";
import { get, postJson } from "./httpService";
import { HapiServer } from "server/types";
import process from "process";
import { createHash } from "crypto";
import { post } from "server/services/httpService";

export type TrustPaymentsConfig = {
  siteReference: string;
  userId: string;
  userPassword: string;
  jwtUserId: string;
  jwtSecretKey: string;
  hashPassword: string;
};

export class TrustPaymentsService {
  private readonly config: TrustPaymentsConfig;

  constructor() {
    const config: TrustPaymentsConfig = {
      siteReference: "siteReference",
      userId: "userId",
      userPassword: "userPassword",
      jwtUserId: "jwtUserId",
      jwtSecretKey: "jwtSecretKey",
      hashPassword: "hashPassword",
    };

    this.config = config;
  }

  async postToTrustPayments() {
    const currencyiso3a = "GBP";
    const mainamount = "10.50";
    const sitereference = "siteReference";
    const version = "2";

    // current time minus 2 minutes
    const date = new Date(Date.now() - 2 * 60 * 1000);

    const sitesecuritytimestamp = date
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);

    const stringToHash =
      currencyiso3a +
      mainamount +
      sitereference +
      version +
      sitesecuritytimestamp +
      this.config.hashPassword;

    const hash =
      "h" + createHash("sha256").update(stringToHash, "utf8").digest("hex");

    console.log("time stamp:", sitesecuritytimestamp);
    console.log("hash:", hash);

    const amount = 10.5;
    const firstName = "Jay";
    const lastName = "Doe";
    const successfulUrlRedirect =
      "https://localhost:3009/radon-enquiry/type-of-support/status";

    const html = `
        <html>
          <body>
            <form id="payform" method="POST" action="https://payments.securetrading.net/process/payments/details">
              <input type="hidden" name="sitereference" value="${this.config.siteReference}">
              <input type="hidden" name="currencyiso3a" value="${currencyiso3a}">
              <input type="hidden" name="mainamount" value="${mainamount}">
              <input type="hidden" name="billingfirstname" value="Jay">
              <input type="hidden" name="billinglastname" value="Doe">
              <input type="hidden" name="strequiredfields" value="billingfirstname">
              <input type="hidden" name="strequiredfields" value="billinglastname">
              <input type="hidden" name="ruleidentifier" value="STR-6">
              <input type="hidden" name="successfulurlredirect" value="${successfulUrlRedirect}">
              <input type="hidden" name="version" value="${version}">
              <input type="hidden" name="stprofile" value="default">
              <input type="hidden" name="stdefaultprofile" value="st_cardonly">
              <input type="hidden" name="sitesecurity" value="${hash}">
              <input type="hidden" name="sitesecuritytimestamp" value="${sitesecuritytimestamp}">
              <input type="submit" value="Pay">
            </form>
          </body>
        </html>
    `;
    console.log("html:", html);
    return html;
  }
}
