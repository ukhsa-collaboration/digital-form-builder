import { RequestHandler } from "msw";
import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";

export const handlers: RequestHandler[] = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  ...rpsRiskReportBackendHandlers,
];
