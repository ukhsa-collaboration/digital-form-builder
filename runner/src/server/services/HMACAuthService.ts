const crypto = require("crypto");

export class HMACAuthService {
  TIME_THRESHOLD: number;
  SECRET_KEY: string;
  logger: any;
  constructor() {
    // Set your secret key for HMAC hashing
    this.SECRET_KEY = "your_secret_key";
    this.TIME_THRESHOLD = 1200; // 5 minutes in seconds
  }

  async createHmac(request, h, email) {
    try {
      // Get current timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);

      //TODO: add futureTimestamp plus twenty minutes

      // Prepare the data for HMAC calculation
      const dataToHash = email + currentTimestamp + this.SECRET_KEY;

      // Calculate the HMAC hash
      const hmac = crypto.createHash("sha256").update(dataToHash).digest("hex");

      function formatUnixTimestamp(timestamp: number): string {
        const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "pm" : "am";

        hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

        return `${hours}.${minutes < 10 ? "0" : ""}${minutes}${ampm}`;
      }

      const hmacExpiryTime = formatUnixTimestamp(
        currentTimestamp + this.TIME_THRESHOLD
      );

      return [hmac, currentTimestamp, hmacExpiryTime];
    } catch (error) {
      console.error("Error processing request:", error);
      return h.response({ error: "Internal server error" }).code(500);
    }
  }

  async validateHmac(request, h) {
    try {
      // Get specific query parameters
      const email = request.query.email;
      const signature = request.query.signature;
      const requestTime = request.query.request_time;

      request.logger.info(["email", "email", request.query]);
      request.logger.info(["signature", "signature", signature]);
      request.logger.info(["requestTime", "requestTime", requestTime]);

      // Get the current UTC time
      const currentUtcUnixTimestamp = Math.floor(Date.now() / 1000);

      if (
        currentUtcUnixTimestamp >
        parseInt(requestTime) + this.TIME_THRESHOLD
      ) {
        return { isValid: false, reason: "expired" };
      }

      // Prepare the data for HMAC calculation
      const dataToHash = email + requestTime + this.SECRET_KEY;

      // Calculate the HMAC hash
      const xResponseHmac = crypto
        .createHash("sha256")
        .update(dataToHash)
        .digest("hex");

      // Verify the HMAC
      if (signature === xResponseHmac) {
        return { isValid: true, reason: "valid" };
      } else {
        return { isValid: false, reason: "invalid_signature" };
      }
    } catch (error) {
      console.error("Error:", error);
      return { isValid: false, reason: "error" };
    }
  }
}
