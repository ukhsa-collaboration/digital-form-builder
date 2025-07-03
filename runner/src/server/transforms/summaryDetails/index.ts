"use strict";

import { contactDetailsToSingleRowsAndFilterSections } from "./contactDetailsToSingleRowsAndFilterSections";

import { SummaryDetailsTransformationMap } from "server/transforms/summaryDetails/types";
export { SummaryDetailsTransformationMap };

/**
 * [View the docs for summary-details-transformations an explanation of how this feature works](docs/runner/summary-details-transforms.md)
 */
const summaryDetailsTransformations: SummaryDetailsTransformationMap = {
  "close-contact-form": contactDetailsToSingleRowsAndFilterSections,
  "close-contact-form-uat": contactDetailsToSingleRowsAndFilterSections,
  "close-contact-form-nl5": contactDetailsToSingleRowsAndFilterSections,
  "close-contact-form-hpt": contactDetailsToSingleRowsAndFilterSections,
  "close-contact-form-hpt-uat": contactDetailsToSingleRowsAndFilterSections,
  "close-contact-form-hpt-nl5": contactDetailsToSingleRowsAndFilterSections,
};

module.exports = summaryDetailsTransformations;
