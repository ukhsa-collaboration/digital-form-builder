import crypto from "crypto";

// Configuration constants
const TIME_THRESHOLD = 1200; // 5 minutes in seconds

function isBritishSummerTime(date) {
  const checkDate = date instanceof Date ? date : new Date(date);
  const year = checkDate.getFullYear();

  // Last Sunday of March (start of BST)
  const marchLastSunday = new Date(year, 2, 31);
  marchLastSunday.setDate(marchLastSunday.getDate() - marchLastSunday.getDay());

  // Last Sunday of October (end of BST)
  const octoberLastSunday = new Date(year, 9, 31);
  octoberLastSunday.setDate(
    octoberLastSunday.getDate() - octoberLastSunday.getDay()
  );

  // Check if date is between these two dates (inclusive of start, exclusive of end)
  return checkDate >= marchLastSunday && checkDate < octoberLastSunday;
}

function adjustTimestampForBST(timestamp) {
  const date = new Date(timestamp * 1000);

  if (isBritishSummerTime(date)) {
    // During BST, add 1 hour (3600 seconds)
    return timestamp + 3600;
  } else {
    // During GMT, no adjustment needed
    return timestamp;
  }
}

/**
 * Formats a Unix timestamp to a human-readable time string
 */
function formatUnixTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

  return `${hours}.${minutes < 10 ? "0" : ""}${minutes}${ampm}`;
}

/**
 * Creates an HMAC signature for authentication
 */
export async function createHmac(email: string, hmacKey: string) {
  try {
    // Get current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Prepare the data for HMAC calculation
    const dataToHash = email + currentTimestamp;

    // Calculate the HMAC hash
    const hmac = crypto
      .createHmac("sha256", hmacKey)
      .update(dataToHash)
      .digest("hex");

    const expiryTimestamp = currentTimestamp + TIME_THRESHOLD;
    const adjustedExpiryForDisplay = adjustTimestampForBST(expiryTimestamp);

    const hmacExpiryTime = formatUnixTimestamp(adjustedExpiryForDisplay);

    return [hmac, currentTimestamp, hmacExpiryTime];
  } catch (error) {
    console.error("Error creating HMAC:", error);
    throw error;
  }
}

/**
 * Validates an HMAC signature
 */
export async function validateHmac(
  email: string,
  signature: string,
  requestTime: string,
  hmacKey: string
) {
  try {
    // Get the current UTC time
    const currentUtcUnixTimestamp = Math.floor(Date.now() / 1000);

    if (currentUtcUnixTimestamp > parseInt(requestTime) + TIME_THRESHOLD) {
      return { isValid: false, reason: "expired" };
    }

    // Prepare the data for HMAC calculation
    const dataToHash = email + requestTime;

    // Calculate the HMAC hash
    const xResponseHmac = crypto
      .createHmac("sha256", hmacKey)
      .update(dataToHash)
      .digest("hex");

    // Verify the HMAC
    if (signature === xResponseHmac) {
      return { isValid: true, reason: "valid" };
    } else {
      return { isValid: false, reason: "invalid_signature" };
    }
  } catch (error) {
    console.error("Error validating HMAC:", error);
    return { isValid: false, reason: "error" };
  }
}
