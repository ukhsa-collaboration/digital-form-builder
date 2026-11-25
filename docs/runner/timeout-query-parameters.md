# Keeping `r` and `d` query parameters across a session timeout

Forms can be opened with `r` and `d` query parameters (e.g. `/my-form?r=abc000&d=01F2`) via [query parameter pre-population](../designer/query-param-prepopulation.md). These values link the submitted form data to the correct record in the backend, so they must survive a session timeout. Without this, "Start application again" would start a form with no `r`/`d`, and the submission couldn't be linked.

Only `r` and `d` are kept. Other query parameters and the user's answers are not.

## Requirements

- `r` and `d` must be components on the form with **allow query parameter pre-population** ticked.
- Values must pass the component's validation. Invalid values are ignored.
- JavaScript and `sessionStorage` must be available. If not, the parameters are lost on timeout (previous behaviour).

There's no form JSON setting. It applies to any form with `r`/`d` pre-population fields.

## How it works

1. **On arrival.** `queryParamPreHandler` validates the query and applies it to the form's answers, following the usual pre-population rules (including `allowPrePopulationOverwrite`). Form pages then render a hidden `#prepop-params` element containing the `r`/`d` values currently held in the form's answers, and `prepop-params.js` copies them into the tab's `sessionStorage` (`prepopParams:{formId}`). Only values the form accepted are stored. If the answers no longer hold `r`/`d`, the element is empty.
2. **On timeout (modal).** `modal-dialog.js` `redirect()` appends the stored values to the timeout URL (`/{formId}/timeout?r=…&d=…`). The timeout route resets the session, revalidates the values and builds the "Start application again" link with them. The timeout page then clears `sessionStorage`.
3. **On session lost without the modal** (e.g. reload after server expiry). The user is redirected to the start page with no params. `prepop-params.js` finds the values in `sessionStorage` and redirects once to `/{formId}?r=…&d=…`. A marker prevents loops: if the server rejects the values, they're deleted and no further redirect happens. This only runs on the form's start page, and not when `startPage` is an external URL.

## When stored values are cleared

- The timeout page or confirmation page is shown
- A restore attempt is rejected
- The tab is closed (values are per tab)
- New `r`/`d` values replace old ones

There's no time-based expiry. If confirmation redirects off-site (`skipSummary` `redirectUrl`), the value stays until the tab closes.

## Code

- Server helpers: [`runner/src/server/plugins/engine/helpers.ts`](./../../runner/src/server/plugins/engine/helpers.ts)
- Reading the parameters from the answers: `prePopParamsPreHandler` in [`runner/src/server/plugins/engine/plugin.ts`](./../../runner/src/server/plugins/engine/plugin.ts)
- Page data: [`runner/src/server/plugins/views.ts`](./../../runner/src/server/plugins/views.ts) and [`runner/src/server/views/layout.html`](./../../runner/src/server/views/layout.html)
- Timeout route: [`runner/src/server/plugins/router.ts`](./../../runner/src/server/plugins/router.ts)
- Browser script: [`runner/public/static/prepop-params.js`](./../../runner/public/static/prepop-params.js)
- Timeout redirect: [`runner/public/static/modal-dialog.js`](./../../runner/public/static/modal-dialog.js)
