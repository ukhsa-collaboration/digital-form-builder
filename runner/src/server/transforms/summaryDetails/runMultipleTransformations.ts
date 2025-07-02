import { sectionsOnlyAndCardConversion } from "./sectionsOnlyAndCardConversion";
import { contactDetailsToSingleRows } from "./contactDetailsToSingleRows";

export function runMultipleTransformations(details) {
  const firstTransform = contactDetailsToSingleRows(
    details,
    ["first_name", "last_name"],
    ["phone_number", "email_address"]
  );
  return sectionsOnlyAndCardConversion(firstTransform);
}