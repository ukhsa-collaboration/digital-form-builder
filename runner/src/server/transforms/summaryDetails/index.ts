"use strict";

import { runMultipleTransformations } from "./runMultipleTransformations";

import { SummaryDetailsTransformationMap } from "server/transforms/summaryDetails/types";
export { SummaryDetailsTransformationMap };

/**
 * [View the docs for summary-details-transformations an explanation of how this feature works](docs/runner/summary-details-transforms.md)
 */
const summaryDetailsTransformations: SummaryDetailsTransformationMap = {
  "close-contact-form": runMultipleTransformations,
  "close-contact-form-uat": runMultipleTransformations,
  "close-contact-form-nl5": runMultipleTransformations,
  "close-contact-form-hpt": runMultipleTransformations,
  "close-contact-form-hpt-uat": runMultipleTransformations,
  "close-contact-form-hpt-nl5": runMultipleTransformations,
};

module.exports = summaryDetailsTransformations;
