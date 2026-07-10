import { http, HttpResponse } from "msw";

export const MOCK_ADDRESSES = [
  {
    addressString: "1 Test Street, London",
    postcode: "SW1A 1AA",
    uprn: "100021873935",
  },
  {
    addressString: "2 Test Street, London",
    postcode: "SW1A 1AA",
    uprn: "100021873936",
  },
  {
    addressString: "3 Test Street, London",
    postcode: "SW1A 1AA",
    uprn: "100021873937",
  },
];

export const addressLookupHandlers = [
  http.get("*/matchAddress", (req) => {
    return HttpResponse.json({
      matchedAddresses: MOCK_ADDRESSES,
    });
  }),
];
