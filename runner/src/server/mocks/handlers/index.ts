import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsRiskReportBackendHandlers } from "./rpsRiskReportBackend";

export const handlers = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  ...rpsRiskReportBackendHandlers,
];
