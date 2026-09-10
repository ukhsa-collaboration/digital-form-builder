# Mock API

For local development, the runner can intercept outbound HTTP calls (address lookup, MSAL auth, and other
backend integrations) with an in-process [msw](https://mswjs.io/) server, instead of calling the real services.

## Enabling

Set the `ENABLE_MOCK_API` environment variable, or `enableMockApi` in config, to `true`.

```
ENABLE_MOCK_API=true
```

This is forced to `false` whenever `env` is `production` (see `runner/src/server/utils/configSchema.ts`), so it
cannot be accidentally enabled in a deployed environment.

## Adding or changing mocked responses

Handlers live in `runner/src/server/mocks/handlers`. Each file exports a `RequestHandler[]` for a single
integration (e.g. `addressLookup.ts`, `msalAuth.ts`), and `runner/src/server/mocks/handlers/index.ts` combines
them into the single `handlers` array used to start the mock server.

Only the aggregate `*Handlers` array for each integration should be exported from its file - keep request/response
schemas, types, and individual endpoint handlers internal to the file unless another module genuinely needs them.
