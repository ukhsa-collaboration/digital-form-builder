# Global hooks

Hooks are named side effects that run at fixed points in a form's lifecycle. They let a single form
run form-specific behaviour — posting to a backend service, recording a payment outcome — without
that behaviour being branched on inside a controller or service.

A hook point is a call to `request.hook.run` in runner code. A form opts in to a hook point by
naming a registered handler against it in the form definition's top-level `hooks` block. Forms
that name nothing for a hook point run nothing there.

`hook` is a hapi plugin that decorates every `request` — no import is needed at a call site, only
`request.hook.run(hookName, context)`.

- Dispatcher (plugin + dispatch logic): [`runner/src/server/services/hooks/index.ts`](./../../runner/src/server/services/hooks/index.ts)
- Registry: [`runner/src/server/services/hooks/registry.ts`](./../../runner/src/server/services/hooks/registry.ts)
- Types: [`runner/src/server/services/hooks/types.ts`](./../../runner/src/server/services/hooks/types.ts)

## Configuring hooks

Add a `hooks` object to the top level of the form's JSON. Keys are hook points, values are handler
names from the registry.

```json
{
  "name": "Order a radon risk report",
  "generateReference": true,
  "paymentProvider": "trust-payments",
  "hooks": {
    "HeadlessSummaryPageController.onSubmit": "rpsRiskReportOnSummarySubmit",
    "TrustPaymentsService.onInvalidPayment": "rpsRiskReportInvalidPayment",
    "TrustPaymentsService.onValidPayment": "rpsRiskReportValidPayment"
  }
}
```

The block is validated by the form schema as `Record<string, string>` — see
[`model/src/schema/schema.ts`](./../../model/src/schema/schema.ts). Neither the keys nor the values
are checked against the runner at validation time, so a typo in either is only caught at runtime:

- an unrecognised **key** never matches a hook point, so nothing runs and nothing is reported
- an unrecognised **value** throws a `ControllerError` with a 500 when that hook point is reached

Use the literal value `"void"` to record explicitly that a form runs nothing at a hook point. It is
treated the same as omitting the key, but documents the decision:

```json
"hooks": {
  "HeadlessSummaryPageController.onAfterSubmit": "void"
}
```

## Hook points

Hook point names follow `<ControllerName|ServiceName>.<event>`. The name is a convention, not
something the dispatcher enforces — it is just the lookup key the call site passes.

| Hook point                                     | Where it fires                                                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `HeadlessSummaryPageController.onBeforeSubmit` | After the gathered state passes the form's filtered schema, before a reference is generated or the summary is marked complete |
| `HeadlessSummaryPageController.onSubmit`       | After the summary is marked complete, before payment is considered                                                            |
| `HeadlessSummaryPageController.onAfterSubmit`  | Immediately after `onSubmit`, before payment is considered                                                                    |
| `TrustPaymentsService.onValidPayment`          | When Trust Payments redirects back and the redirect verifies                                                                  |
| `TrustPaymentsService.onInvalidPayment`        | When Trust Payments redirects back and the redirect fails verification, before the `ControllerError` is thrown                |

Call sites:
[`HeadlessSummaryPageController.ts:156`](./../../runner/src/server/plugins/engine/pageControllers/HeadlessSummaryPageController.ts#L156),
[`paymentProviders/index.ts:187`](./../../runner/src/server/services/paymentProviders/index.ts#L187).

## Registered hooks

Handlers live in [`runner/src/server/services/hooks/`](./../../runner/src/server/services/hooks/),
grouped by the service they belong to (currently `rps/`), and are exported from `registry.ts`.

| Handler                        | What it does                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `rpsRiskReportOnSummarySubmit` | Maps risk report form state to a `/storereport` payload, validates it, and posts to the RPS backend |
| `rpsGasTestKitOnSummarySubmit` | Maps gas test kit form state to a `/storegtk` payload, validates it, and posts to the RPS backend   |
| `rpsRiskReportValidPayment`    | Posts `SETTLED` to `/storepayment` for the session's order                                          |
| `rpsRiskReportInvalidPayment`  | Posts `NOT_SETTLED` to `/storepayment` for the session's order                                      |

## What a hook receives

```ts
export type Hook<TReturn = void> = (
  request: HapiRequest,
  context: HookContext
) => Promise<TReturn>;

export interface HookContext {
  model: FormModel;
  state: Record<string, any>;
}
```

`state` is the current session state. The dispatcher resolves it from `cacheService` when the call
site does not supply it, so a hook always gets state whether or not the caller already had it to
hand. Other services are reached through the request's service registry:

```ts
const { rpsBackendService } = request.service.getServices("rpsBackendService");
```

## What a hook can and cannot do

A hook is a side effect, not a route handler. It never receives the Hapi response toolkit, so it
cannot redirect, render, or short-circuit its caller.

- **To fail the request**, throw — usually `ControllerError` with a `code`. The request lifecycle
  handles it generically, and the caller's remaining work does not run.
- **To report an outcome**, return it via the `TReturn` generic. The caller decides what, if
  anything, to do with the value; acting on it is the call site's explicit responsibility, added
  there. All current hooks are `Hook<void>`.

Hooks at the same point run in the order the call sites appear in the caller — one handler per hook
point per form, since the config is a plain key/value map.

## Adding a hook

1. Write the handler in `runner/src/server/services/hooks/<group>/<name>.ts`, typed as
   `Hook<TReturn>`:

   ```ts
   import { ControllerError } from "server/plugins/engine/errors";
   import { Hook } from "../types";

   export const myServiceOnSubmit: Hook<void> = async (request, context) => {
     const { state } = context;
     const { myBackendService } = request.service.getServices(
       "myBackendService"
     );

     const response = await myBackendService.request("/submit", {
       method: "POST",
       body: JSON.stringify({ reference: state["generatedReference"] }),
     });

     if (response.status !== 200) {
       throw new ControllerError("Request to my backend has failed", {
         code: 500,
       });
     }
   };
   ```

2. Add it to `hookRegistry` in `registry.ts`. `HookAction` is derived from the registry's keys, so
   registering is what makes the name valid in a form's `hooks` block.

   ```ts
   export const hookRegistry = {
     // ...
     myServiceOnSubmit,
   } as const;
   ```

3. Name it against a hook point in the form JSON.

Validate the outbound payload against a schema in the model package before sending it, rather than
trusting form state to be shaped correctly — see `rpsGasTestKitOnSummarySubmit` for the pattern.
That keeps a bad mapping a 500 in the runner with a readable message, instead of a rejected request
at the backend.

## Adding a hook point

Call `request.hook.run` from the controller or service, passing a lookup key and at least the
model. No import is needed — `hook` is a decorated property available on every `request`:

```ts
await request.hook.run("MyController.onSomething", { model });
```

Pass `state` too if the caller already has it, to save the dispatcher a cache read:

```ts
await request.hook.run("MyController.onSomething", { model, state });
```

New form-specific behaviour on an existing path should become a new hook (or a new hook point), not
a new branch or subclass in the caller. `HeadlessSummaryPageController` exists precisely to keep
that logic out of the controller.

## Logging

The hook dispatcher logs at `trace` under the `runHook` tag: when no hook is configured for a point,
when a hook starts, when an unknown action name is found, and when a hook completes. Individual
handlers log their own request and response payloads at `trace` under `<handlerName>.<stage>`.

## Testing

Hook tests live in
[`runner/test/cases/server/services/hooks/`](./../../runner/test/cases/server/services/hooks/),
mirroring the source layout. Handlers are plain async functions, so they can be called directly with
a stubbed `request` — `request.service.getServices` and `request.logger` are the usual stub points.

The dispatcher itself has direct unit test coverage in `index.test.ts` (the no-op, unknown-action,
and state-from-cache-vs-passed-in branches), and the `server.decorate` wiring that exposes
`request.hook.run` has its own small integration test in `plugin.test.ts`, which registers the
plugin against a minimal hapi server and exercises it via `server.inject`.
