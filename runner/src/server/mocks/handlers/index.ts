import { RequestHandler } from "msw";
import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";
import { gtkBackendHandlers } from "./gtkBackend";

export const handlers: RequestHandler[] = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  ...rpsRiskReportBackendHandlers,
  ...gtkBackendHandlers,
];
