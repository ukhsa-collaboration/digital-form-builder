import { RequestHandler } from "msw";
import { addressLookupHandlers } from "./addressLookup";
import { msalAuthHandlers } from "./msalAuth";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";
import { rpsGasTestKitBackendHandlers } from "./rpsGasTestKitBackend";

export const handlers: RequestHandler[] = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  // RPS - Radon Protection Sciences
  ...rpsRiskReportBackendHandlers,
  ...rpsGasTestKitBackendHandlers,
];
