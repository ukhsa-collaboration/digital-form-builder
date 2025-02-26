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

  // async readHmacValue(request, h, email) {
  //   try {
  //     // Get the current UTC time as a UNIX timestamp
  //     const currentRequestUtcUnixTimestamp = Math.floor(Date.now() / 1000);

  //     // Define the request URI
  //     const requestUri =
  //       "/example/users?user=test&institutionID=999&signature=7e745d74b69b7f62e8e2";

  //     // Prepare the data for HMAC calculation
  //     const dataToHash =
  //       requestUri + currentRequestUtcUnixTimestamp + this.SECRET_KEY;

  //     // Calculate the HMAC hash
  //     const xRequestHmac = crypto
  //       .createHash("sha256")
  //       .update(dataToHash)
  //       .digest("hex");

  //     // Set the request headers
  //     const headers = {
  //       "X-Authorization-Content-HMAC": xRequestHmac, // Include the HMAC hash in the request header
  //       "X-Authorization-Timestamp": currentRequestUtcUnixTimestamp.toString(), // Include the current timestamp in the request header
  //     };

  //     // Send a GET request to the server
  //     const response = await axios.get(`http://127.0.0.1:5000${requestUri}`, {
  //       headers,
  //     });

  //     // Print the HTTP status code of the response
  //     console.log("HTTP", response.status);

  //     // Print the response headers
  //     for (const [key, value] of Object.entries(response.headers)) {
  //       console.log(`${key}: ${value}`);
  //     }
  //     console.log("\n");

  //     // Print the response body
  //     console.log(response.data);

  //     // Get the timestamp and HMAC from the response headers
  //     const xResponseTimestamp =
  //       response.headers["x-response-content-timestamp"];
  //     const xResponseHmac = response.headers["x-response-content-hmac"];

  //     // Get the current UTC time
  //     const currentUtcUnixTimestamp = Math.floor(Date.now() / 1000);

  //     // Format the timestamps for display
  //     const datetimeXResponseTimestamp = formatTimestamp(
  //       parseInt(xResponseTimestamp)
  //     );
  //     const currentDatetime = formatTimestamp(currentUtcUnixTimestamp);

  //     // Prepare the data for HMAC calculation
  //     const responseHmacData = `${xResponseTimestamp}|${JSON.stringify(
  //       response.data
  //     )}`;
  //     const responseDataHash = crypto
  //       .createHash("sha256")
  //       .update(responseHmacData + SECRET_KEY)
  //       .digest("hex");

  //     // Calculate the time difference between the response timestamp and the current time
  //     const timeDifference = Math.abs(
  //       currentUtcUnixTimestamp - parseInt(xResponseTimestamp)
  //     );

  //     // Verify the HMAC and print the results
  //     if (responseDataHash === xResponseHmac) {
  //       console.log("Server response HMAC verification successful");
  //       console.log("--------------");
  //       console.log(`Response timestamp: ${datetimeXResponseTimestamp}`);
  //       console.log(`Current time: ${currentDatetime}`);
  //       console.log(`Time difference: ${timeDifference}`);
  //     } else {
  //       console.log("HMAC verification failed");
  //     }
  //   } catch (error: any) {
  //     console.error("Error:", error.message);
  //     if (error.response) {
  //       console.error("Response status:", error.response.status);
  //       console.error("Response headers:", error.response.headers);
  //       console.error("Response data:", error.response.data);
  //     }
  //   }
  // }

  // async start() {
  //   try {
  //     await this.server.start();
  //     console.log(
  //       `HMAC Authentication Service running at: ${this.server.info.uri}`
  //     );
  //   } catch (err) {
  //     console.error("Error starting server:", err);
  //     process.exit(1);
  //   }
  // }

  // async stop() {
  //   try {
  //     await this.server.stop();
  //     console.log("Server stopped");
  //   } catch (err) {
  //     console.error("Error stopping server:", err);
  //     process.exit(1);
  //   }
  // }
}

// // Create and start the service
// const init = async () => {
//   const authService = new HMACAuthService();
//   await authService.start();

//   // Handle shutdown gracefully
//   process.on("SIGINT", async () => {
//     console.log("Stopping server...");
//     await authService.stop();
//     process.exit(0);
//   });
// };
