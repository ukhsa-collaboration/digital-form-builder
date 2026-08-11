import { RequestHandler } from "msw";
import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";
import { rpsGasTestKitBackendHandlers } from "./rpsGasTestKitBackend";

export const handlers: RequestHandler[] = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  // RPS - Radon Protection Sciences
  ...rpsRiskReportBackendHandlers,
  ...rpsGasTestKitBackendHandlers,
];
