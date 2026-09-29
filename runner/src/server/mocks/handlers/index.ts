import { RequestHandler } from "msw";
import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";
import { rpsGasTestKitBackendHandlers } from "./rpsGasTestKitBackend";
import { rpsEnquiryBackendHandlers } from "./rpsEnquiryBackend";

export const handlers: RequestHandler[] = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  // RPS - Radon Protection Sciences
  ...rpsEnquiryBackendHandlers,
  ...rpsRiskReportBackendHandlers,
  ...rpsGasTestKitBackendHandlers,
];
