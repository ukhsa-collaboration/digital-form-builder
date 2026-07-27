import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";
import { rpsBackendLookupHandlers } from "./rpsBackendLookup";

export const handlers = [
  ...msalAuthHandlers,
  ...addressLookupHandlers,
  ...rpsBackendLookupHandlers,
];
