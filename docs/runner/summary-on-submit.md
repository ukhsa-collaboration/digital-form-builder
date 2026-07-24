# Summary page `onSubmit` actions

`summaryConfig.onSubmit` runs a named server-side action when a user submits the summary page, before the normal outputs/payment flow. Use it to persist data to a backend, write an audit log, or redirect the user.

## Configuration

Add `onSubmit` to the `summaryConfig` object in your form's JSON definition:

```json
{
  "summaryConfig": {
    "onSubmit": {
      "action": "myActionName",
      "parameters": {
        "someKey": "someValue"
      }
    }
  }
}
```

| Field        | Type     | Required | Description                                                            |
| ------------ | -------- | -------- | ---------------------------------------------------------------------- |
| `action`     | `string` | Yes      | Name of a registered action in `submitActionRegistry`                  |
| `parameters` | `object` | No       | Arbitrary key/value pairs passed to the action as `context.parameters` |

## Execution order

On POST to the summary page, the runner executes steps in this order:

1. Validate the form is complete (redirect to start if not)
2. Check the declaration checkbox (if `summaryConfig.declaration` is configured)
3. **Run `onSubmit` action** ← this step
4. Merge outputs and webhook data into cache
5. Check fees; redirect to GOV.UK Pay or `/status`

If the action returns a Hapi response (e.g. `h.redirect(...)`) the runner returns that response immediately and skips steps 4 and 5. If the action returns `void` (or resolves without a return value), the normal flow continues.

## Registering a new action

Actions are registered in [`runner/src/server/services/submitActions/index.ts`](./../../runner/src/server/services/submitActions/index.ts).

1. Create a new file for the action in `runner/src/server/services/submitActions/`, for example `myAction.ts`:

   ```ts
   // runner/src/server/services/submitActions/myAction.ts
   import { SubmitAction } from "./types";

   export const myAction: SubmitAction = async (request, h, context) => {
     const { model, summaryViewModel, parameters } = context;

     // Read current form state
     const { cacheService } = request.services([]);
     const state = await cacheService.getState(request);

     // Do something — call a backend, write a log, etc.
     await someService.post(state);

     // Return void to continue the normal submit flow.
     // Return h.redirect(...) to short-circuit it.
   };
   ```

2. Register the action in `index.ts`:

   ```ts
   import { myAction } from "./myAction";

   export const submitActionRegistry: Record<string, SubmitAction> = {
     myAction,
     // existing actions...
   };
   ```

3. Reference it in the form JSON:

   ```json
   {
     "summaryConfig": {
       "onSubmit": {
         "action": "myAction"
       }
     }
   }
   ```

If `action` names a key that is not in `submitActionRegistry`, the runner throws a 500 error at submit time.

## Action context

Every action receives three arguments:

| Argument                   | Type                               | Description                                                                                 |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `request`                  | `HapiRequest`                      | The Hapi request object; use `request.services([])` to access `cacheService`, etc.          |
| `h`                        | `HapiResponseToolkit`              | The Hapi response toolkit; use `h.redirect(url)` to short-circuit the submit flow           |
| `context.model`            | `FormModel`                        | The parsed form model                                                                       |
| `context.summaryViewModel` | `SummaryViewModel`                 | The summary view model, including the user's answers after all transforms have been applied |
| `context.parameters`       | `Record<string, any> \| undefined` | The `parameters` object from the form JSON, if any                                          |

## Built-in action: `saveRiskReportDetails`

The `saveRiskReportDetails` action is registered in this repository. It:

1. Reads the current form state from the cache
2. Validates and remaps fields using `saveRiskReportDetailsSchema`
3. POSTs the mapped data to `/storereport` on the configured `rpsBackendService`
4. Returns `void`, so the normal submit flow (fee check / pay redirect) continues

See [`runner/src/server/services/submitActions/index.ts`](./../../runner/src/server/services/submitActions/index.ts) and [`runner/src/server/services/submitActions/saveRiskReportDetailsSchema.ts`](./../../runner/src/server/services/submitActions/saveRiskReportDetailsSchema.ts) for the implementation.

## Full `summaryConfig` example

```json
{
  "summaryConfig": {
    "submitLabel": "Confirm and go to payment",
    "onSubmit": {
      "action": "saveRiskReportDetails"
    },
    "declaration": {
      "hideDeclarationHeading": true,
      "label": "I agree to the <a href=\"/privacy\">Privacy Policy</a> and <a href=\"/terms\">Terms and Conditions</a>.",
      "errorMessage": "You must accept the Privacy Policy and Terms and Conditions before continuing"
    },
    "mergeFields": [
      {
        "names": ["addressLine1", "addressLine2", "town", "postcode"],
        "to": "Address",
        "joiner": ", "
      }
    ]
  }
}
```

For the full set of `summaryConfig` options (transforms, relabelling, conditional rows, etc.) see [summary details transforms](./summary-details-transforms.md).
