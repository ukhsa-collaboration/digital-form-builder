# Trust Payments adapter

Trust Payments is one of two payment gateways a form can use, selected via `paymentProvider` on
the form definition. It differs from GOV.UK Pay in that there is no payment-status API to poll —
the runner builds a self-submitting HTML form that posts the user's browser straight to Trust
Payments, and Trust Payments redirects the browser back to the runner with a signed query string
that proves the response wasn't tampered with.

The implementation is split across two files:

- [`runner/src/server/services/trustPaymentsService.ts`](./../../../runner/src/server/services/trustPaymentsService.ts) —
  `TrustPaymentsService`, a per-form [dynamic service](#configuration) that builds the payment
  form HTML and verifies the signed redirect.
- [`runner/src/server/services/paymentProviders/index.ts`](./../../../runner/src/server/services/paymentProviders/index.ts) —
  `TrustPaymentsAdapter`, the `PaymentProviderService` implementation that
  `HeadlessSummaryPageController` and `StatusService` actually call. It adapts the
  provider-agnostic `createPayment` / `redirectUser` / `verifyRedirect` contract onto
  `TrustPaymentsService`.

See [payment provider adapters](../../../runner/src/server/services/paymentProviders/index.ts) for
how `paymentProviderRegistry` fits alongside the GOV.UK Pay adapter, and [hooks.md](./../hooks.md)
for the hook mechanism referenced throughout this doc.

## Configuration

Trust Payments needs two things configured on the form definition: the dynamic service instance
(the gateway credentials) and the provider selection.

```json5
{
  paymentProvider: "trust-payments",
  services: [
    {
      name: "trustPaymentsService",
      service: "trustPaymentsService",
      parameters: {
        siteReference: "site12345",
        hashPassword: "shared-secret-from-trust-payments",
      },
    },
  ],
  hooks: {
    "TrustPaymentsAdapter.getBillingInformation": "myFormGetBillingInformation",
    "TrustPaymentsService.onValidPayment": "myFormValidPayment",
    "TrustPaymentsService.onInvalidPayment": "myFormInvalidPayment",
  },
}
```

- `paymentProvider: "trust-payments"` is the key `paymentProviderRegistry` is looked up by in
  `HeadlessSummaryPageController` and `StatusService`. It's a plain string, validated only as
  `joi.string().optional()` — an unregistered value throws a `ControllerError` (500) the first
  time a form tries to submit.
- `services` is the generic per-form dynamic service mechanism
  (`runner/src/server/services/dynamicServices.ts`). `service: "trustPaymentsService"` selects
  `TrustPaymentsService` from `serviceRegistry`; `name` is the instance name other code looks it
  up by (`request.service.getServices("trustPaymentsService")`). `parameters` is passed straight
  through as the constructor's `TrustPaymentsConfig`
  (`model/src/schema/services/trustPaymentsSchemas.ts`):

  | Field               | Purpose                                                                   |
  | ------------------- | ------------------------------------------------------------------------- |
  | `siteReference`     | Trust Payments site reference, sent as `sitereference` on the form post   |
  | `hashPassword`      | Shared secret used to sign the outgoing form and verify the redirect      |
  | `successWebhookUrl` | Set as `successfulurlnotification` — Trust Payments calls this on success |
  | `failureWebhookUrl` | Set as `declinedurlnotification` — Trust Payments calls this on decline   |

- The three hook points let a form react to billing information collection and payment outcome
  without changing runner code — see [Hooks](#hooks) below.

## Payment creation flow

1. `HeadlessSummaryPageController` resolves the adapter from `paymentProviderRegistry` by
   `model.def.paymentProvider` and calls `createPayment(request, state, feesModel, model)`.
2. `TrustPaymentsAdapter.createPayment` runs the `TrustPaymentsAdapter.getBillingInformation` hook
   to get `{ billingFirstName, billingLastName, billingEmailAddress? }` from the form's own state
   (there's no fixed set of field names Trust Payments needs these from, so each form maps its own
   state to this shape). The result is validated against `billingInformationSchema` — an invalid
   mapping throws a `ControllerError` (500) here rather than failing silently at the gateway.
3. It calls `trustPaymentsService.createTrustPaymentsForm(...)` with that billing information plus
   `amount` (from `feesModel.total`), an `orderReference` (the request's correlation ID), and a
   `redirectUrl` (`/<formId>/status` on the current origin).
4. `createTrustPaymentsForm` builds the outgoing HTML: an auto-submitting `<form>` POSTing to
   `https://payments.securetrading.net/process/payments/details`, signed with a `sitesecurity`
   hash. The hash covers `currencyiso3a + mainamount + sitereference + version + orderreference +
siteSecurityTimestamp + hashPassword`, using a timestamp backdated by 2 minutes to tolerate
   clock drift with Trust Payments' servers.
5. `TrustPaymentsAdapter.redirectUser` returns that HTML directly as the response
   (`h.response(html).type("text/html")`) rather than an HTTP redirect — the browser is handed a
   page whose only content is a form that submits itself via a `<script>` tag.
6. The controller freezes session state (`cacheService.freezeState`) before returning this
   response, so nothing can mutate the state Trust Payments is about to be told about.

## Redirect verification

Trust Payments redirects the user's browser back to `redirectUrl` (`/<formId>/status`) with the
outcome as query parameters, including a `responsesitesecurity` hash it computed the same way the
runner will need to.

`TrustPaymentsService.verifyRedirect(request)`:

1. Throws a `ControllerError` (500) if `responsesitesecurity` is missing — that's not a failed
   payment, it's a malformed redirect that shouldn't be trusted at all.
2. Recomputes the hash: takes every other query param, sorts by key alphabetically, concatenates
   just the _values_ (not the keys), appends `hashPassword`, and SHA-256s the result.
3. Compares the recomputed hash to `responsesitesecurity` with `crypto.timingSafeEqual` — a plain
   `===` would leak how many leading bytes matched via response timing, which matters here because
   the comparison is the only thing standing between an attacker and forging a successful payment
   notification.

`TrustPaymentsAdapter.verifyRedirect` (the `PaymentProviderService` method, called from
`StatusService.shouldShowPayErrorPage`) wraps that boolean: it also checks
`errorcode` on the query string, and if either check fails, runs the
`TrustPaymentsService.onInvalidPayment` hook before throwing. If both pass, it runs
`TrustPaymentsService.onValidPayment`. These are the two hook points a form uses to record the
payment outcome against its own backend (see the `rpsRiskReportValidPayment` /
`rpsRiskReportInvalidPayment` handlers in [hooks.md](./../hooks.md) for a worked example).

## Testing

Unit tests for the hash logic live in
[`runner/test/cases/server/services/trustPaymentsService.test.ts`](./../../../runner/test/cases/server/services/trustPaymentsService.test.ts) —
they cover a valid signature, a mismatched signature, tampered query params (same signature, wrong
values), and the missing-`responsesitesecurity` error case. There's no fixture form or query
example checked in for the adapter layer (`TrustPaymentsAdapter`) itself.
