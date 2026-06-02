# Address Lookup

This service supports address lookup via an APIM-hosted address search service. This allows users to search for addresses by postcode, returning matched addresses from the Royal Mail Delivery Point Address (DPA) or Local Property Identifier (LPI) dataset to retrive values such as URPRN.

## Setup

To use address lookup in your form, you will need to configure the following environment variables:

| Variable name | Definition | Example |
| --- | --- | --- |
| `APIM_BASE_URL` | The base URL of the APIM address lookup service | `https://apim.example.com` |
| `CALLING_APPLICATION` | The name of the calling application | `RPS` or `CIMS` etc |
| `SUBSCRIPTION_KEY` | Optional APIM subscription key | `abc123` |
| `TENANT_ID` | Azure AD tenant ID for MSAL authentication | `tenant-id` |
| `CLIENT_ID` | Azure AD client ID for MSAL authentication | `client-id` |
| `CLIENT_SECRET` | Azure AD client secret for MSAL authentication | `client-secret` |
| `SCOPES` | MSAL scopes required to access the address lookup service | `["https://example.com/.default"]` |

> [NOTE]
> MSAL configuration variables are at the form level. Each form registers its own `AddressLookupService` instance with its own credentials, meaning multiple forms on the same server can authenticate against different tenants independently.

## DI Registration

Each form should register its own `AddressLookupService` instance via IoC. This is how multi-tenancy is supported so there is no shared state between instances.

```typescript
service.register("addressLookupService", {
  useValue: new AddressLookupService({
    apimBaseUrl: process.env.APIM_BASE_URL,
    callingApplication: process.env.CALLING_APPLICATION,
    subscriptionKey: process.env.SUBSCRIPTION_KEY), // this one is an optional field
    tenantId: process.env.TENANT_ID,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: [process.env.SCOPES],
  }),
});
```

## Usage

Once registered, the service can be used to look up addresses by postcode:

```typescript
const service = service.resolve<AddressLookupService>("addressLookupService");

const result = await service.lookupByPostcode("YO1 7HH");

console.log(result.matchedAddresses);
// [
//   {
//     addressString: "8A, MINSTER YARD, YORK, YO1 7HH",
//     postcode: "YO1 7HH",
//     uprn: "100050571716",
//     udprn: "27217071",
//     etc...
//   }
// ]
```

### Options

`lookupByPostcode` accepts an optional second argument to configure the lookup:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `dataset` | `"DPA" \| "LPI"` | `"DPA"` | The dataset to search against. DPA is the standard dataset for UDPRN-based lookups, so it's set as a default value. LPI does not include a UDPRN value. |
| `fuzzy` | `boolean` | `false` | Enable fuzzy matching. Not applicable for postcode lookups as postcodes are exact strings, so it's set as a false by default. |
| `maxResults` | `number` | `100` | Maximum number of results to return. 100 is the hard limit of the lookup service - requests above this will fail at the API level so the default value is 100. |

```typescript
const result = await service.lookupByPostcode("YO1 7HH", {
  dataset: "LPI",
  maxResults: 100,
});
```

## Multi-tenant support

Multi-tenancy is supported for each form IoC registration. Each form registers its own `AddressLookupService` with an `AddressLookupConfig`, which includes its own MSAL credentials. There is no shared state between instances, so forms on the same deployed server can authenticate against different tenants independently.

## Token lifecycle

Authentication is handled by `MsalAuthorizer`, which uses the MSAL package's `acquireTokenByClientCredential`. MSAL caches tokens internally and reuses them until expiry (or at least near expiry), so there is no network call to the identity provider on every lookup. Token refresh is also handled automatically by MSAL, so no additional retry or refresh logic is needed.