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

      // Prepare the data for HMAC calculation
      const dataToHash = email + currentTimestamp + this.SECRET_KEY;

      // Calculate the HMAC hash
      const hmac = crypto.createHash("sha256").update(dataToHash).digest("hex");

      return hmac;
    } catch (error) {
      console.error("Error processing request:", error);
      return h.response({ error: "Internal server error" }).code(500);
    }
  }

  async validateHmac(request, h) {
    try {
      // Get the URL path
      const path = request.path;
      console.log("URL path:", path);

      // Get all query parameters as an object
      const queryParams = request.query;
      console.log("Query parameters:", queryParams);

      // Get specific query parameters
      const email = request.query.email;
      const signature = request.query.signature;
      const requestTime = request.query.request_time;
      // Prepare the data for HMAC calculation

      const dataToHash = email + requestTime + this.SECRET_KEY;

      // Calculate the HMAC hash
      const xResponseHmac = crypto
        .createHash("sha256")
        .update(dataToHash)
        .digest("hex");

      // Get the current UTC time
      const currentUtcUnixTimestamp = Math.floor(Date.now() / 1000);

      const responseDataHash = signature;

      // Calculate the time difference between the response timestamp and the current time
      const timeDifference = Math.abs(
        currentUtcUnixTimestamp - parseInt(requestTime)
      );

      // Verify the HMAC and print the results
      if (timeDifference > this.TIME_THRESHOLD) return false;

      if (responseDataHash === xResponseHmac) {
        return true;
      } else {
        console.log("HMAC verification failed");
        return false;
      }
    } catch (error: any) {
      console.error("Error:", error);
      return false;
    }
  }
}
