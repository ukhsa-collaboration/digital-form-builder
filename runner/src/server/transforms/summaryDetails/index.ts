"use strict";

import { sectionsOnlyAndContactValueConversion } from "./sectionsOnlyAndContactValueConversion";

import { SummaryDetailsTransformationMap } from "server/transforms/summaryDetails/types";
export { SummaryDetailsTransformationMap };

/**
 * [View the docs for summary-details-transformations an explanation of how this feature works](docs/runner/summary-details-transforms.md)
 */
const summaryDetailsTransformations: SummaryDetailsTransformationMap = {
  "close-contact-form": sectionsOnlyAndContactValueConversion,
  "close-contact-form-uat": sectionsOnlyAndContactValueConversion,
  "close-contact-form-nl5": sectionsOnlyAndContactValueConversion,
  "close-contact-form-hpt": sectionsOnlyAndContactValueConversion,
  "close-contact-form-hpt-uat": sectionsOnlyAndContactValueConversion,
  "close-contact-form-hpt-nl5": sectionsOnlyAndContactValueConversion,
};

module.exports = summaryDetailsTransformations;
