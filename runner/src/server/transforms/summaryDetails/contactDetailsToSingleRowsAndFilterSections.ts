import { contactDetailsToSingleRows } from "./contactDetailsToSingleRows";
import { filterSections } from "./filterSections";

export function contactDetailsToSingleRowsAndFilterSections(details) {
  const firstTransform = contactDetailsToSingleRows(
    details,
    ["first_name", "last_name"],
    ["phone_number", "email_address"]
  );
  return filterSections(firstTransform);
}