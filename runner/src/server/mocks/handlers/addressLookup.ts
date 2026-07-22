import { http, HttpResponse } from "msw";

export const MOCK_ADDRESSES = [
  {
    addressString: "1 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20764756",
  },
  {
    addressString: "2 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20765165",
  },
  {
    addressString: "3 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20765140",
  },
];

export const addressLookupHandlers = [
  http.get("*/matchAddress", () => {
    return HttpResponse.json({
      matchedAddresses: MOCK_ADDRESSES,
    });
  }),
];
