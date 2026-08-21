import { http, HttpResponse, RequestHandler } from "msw";

const MOCK_ADDRESSES = [
  {
    addressString: "1 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20764756",
    uprn: "185788542",
    parentUprn: "",
    blpuCode: "CH",
    locationX: -7.831254,
    locationY: 54.5085434,
    latitude: 54.5085434,
    longitude: -7.831254,
    countryCode: "N",
  },
  {
    addressString: "2 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20765165",
    uprn: "185788542",
    parentUprn: "",
    blpuCode: "CH",
    locationX: -7.831254,
    locationY: 54.5085434,
    latitude: 54.5085434,
    longitude: -7.831254,
    countryCode: "N",
  },
  {
    addressString: "3 Test Street, London, SW1A 1AA",
    postcode: "SW1A 1AA",
    udprn: "20765140",
    uprn: "185788542",
    parentUprn: "",
    blpuCode: "CH",
    locationX: -7.831254,
    locationY: 54.5085434,
    latitude: 54.5085434,
    longitude: -7.831254,
    countryCode: "N",
  },
];

/**
 * Lookup address API provided by OS Places API
 * @link https://www.api.gov.uk/os/os-places-api/#os-places-api
 */
const lookupAddressEndpoint = http.get("*/matchAddress", () => {
  return HttpResponse.json({
    matchedAddresses: MOCK_ADDRESSES,
  });
});

export const addressLookupHandlers: RequestHandler[] = [lookupAddressEndpoint];
