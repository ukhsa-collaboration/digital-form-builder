import { msalAuthHandlers } from "./msalAuth";
import { addressLookupHandlers } from "./addressLookup";

export const handlers = [...msalAuthHandlers, ...addressLookupHandlers];
