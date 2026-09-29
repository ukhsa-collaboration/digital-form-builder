import joi from "joi";
import {
  PhoneNumber,
  PhoneNumberFormat,
  PhoneNumberUtil,
} from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

const phoneParseErrors: Record<string, string> = {
  "Invalid country calling code": "INVALID_COUNTRY_CODE",
  "The string supplied did not seem to be a phone number": "NOT_A_NUMBER",
  "Phone number too short after IDD": "TOO_SHORT_AFTER_IDD",
  "The string supplied is too short to be a phone number": "TOO_SHORT_NSN",
  "The string supplied is too long to be a phone number": "TOO_LONG",
};

const phoneValidationResult: Record<PhoneNumberUtil.ValidationResult, string> =
  {
    [PhoneNumberUtil.ValidationResult.IS_POSSIBLE]: "IS_POSSIBLE",
    [PhoneNumberUtil.ValidationResult.INVALID_COUNTRY_CODE]:
      "INVALID_COUNTRY_CODE",
    [PhoneNumberUtil.ValidationResult.TOO_SHORT]: "TOO_SHORT",
    [PhoneNumberUtil.ValidationResult.TOO_LONG]: "TOO_LONG",
    [PhoneNumberUtil.ValidationResult.IS_POSSIBLE_LOCAL_ONLY]:
      "IS_POSSIBLE_LOCAL_ONLY",
    [PhoneNumberUtil.ValidationResult.INVALID_LENGTH]: "INVALID_LENGTH",
  };

function getPhoneParseError(error) {
  const errorType =
    error instanceof Error ? phoneParseErrors[error.message] : "INVALID_NUMBER";
  return errorType;
}

function formatPhoneNumber(phone: PhoneNumber, format: string) {
  switch (format) {
    case "INTERNATIONAL":
      return phoneUtil.format(phone, PhoneNumberFormat.INTERNATIONAL);
      break;
    case "NATIONAL":
      return phoneUtil.format(phone, PhoneNumberFormat.NATIONAL);
      break;
    case "E164":
      return phoneUtil.format(phone, PhoneNumberFormat.E164);
      break;
    case "RFC3966":
      return phoneUtil.format(phone, PhoneNumberFormat.RFC3966);
      break;
    default:
      return phoneUtil.format(phone, PhoneNumberFormat.INTERNATIONAL);
  }
}

function parseAndValidatePhoneNumber(
  value: string,
  _helpers: joi.CustomHelpers,
  isInternationalOnly: boolean = false,
  isUKOnly: boolean = false
) {
  let phone;
  try {
    // Default to GB as when parsing a phone number, no region code makes the dialling code required
    // The parsing method will self correct the region metadata provided region does not match
    const parseRegion = isInternationalOnly ? "" : "GB";
    phone = phoneUtil.parseAndKeepRawInput(value, parseRegion);
  } catch (error) {
    return _helpers.error(getPhoneParseError(error));
  }

  // Check phone length and country code
  const reason = phoneUtil.isPossibleNumberWithReason(phone);
  if (reason !== PhoneNumberUtil.ValidationResult.IS_POSSIBLE) {
    return _helpers.error(phoneValidationResult[reason]);
  }

  // Check against own regional regex
  if (!phoneUtil.isValidNumber(phone)) {
    return _helpers.error("INVALID_NUMBER");
  }

  // Check if from UK regions
  if (isUKOnly) {
    const UK_REGIONS = ["GB", "JE", "GG", "IM"];
    const code = phoneUtil.getRegionCodeForNumber(phone);
    if (code === undefined || !UK_REGIONS.includes(code)) {
      return _helpers.error("NON_UK_NUMBER");
    }
  }

  return formatPhoneNumber(phone, "INTERNATIONAL");
}

export function internationalPhoneValidator(
  value: string,
  _helpers: joi.CustomHelpers
) {
  return parseAndValidatePhoneNumber(value, _helpers, true);
}

export function ukPhoneValidator(value: string, _helpers: joi.CustomHelpers) {
  return parseAndValidatePhoneNumber(value, _helpers, false, true);
}

export function ukAndInternationalValidator(
  value: string,
  _helpers: joi.CustomHelpers
) {
  return parseAndValidatePhoneNumber(value, _helpers);
}
