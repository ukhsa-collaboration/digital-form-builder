# CODEMAP — digital-form-builder

## 1. Purpose

A Yarn-workspace monorepo that lets non-developers build and publish multi-page government web forms (GOV.UK Design System style) through a visual drag-and-drop designer, and serves those forms to citizens via a runtime engine. Form submissions are routed to one or more outputs (webhook, email, GOV.UK Notify, GOV.UK Pay). A separate submitter service retries failed webhook deliveries from a MySQL queue.

## 2. Tech Stack

| Concern          | Tool / Version                                                                    |
| ---------------- | --------------------------------------------------------------------------------- |
| Runtime          | Node ≥ 20 (runner), ≥ 16 (designer/model) — pin: `.nvmrc` = 20                    |
| Language         | TypeScript 5.x (all packages), compiled via Babel (not `tsc`) for emit            |
| Package manager  | Yarn 3.2.2, `nodeLinker: node-modules`                                            |
| Server framework | Hapi.js (`@hapi/hapi` ^21 in runner, ^20 in designer) with `schmervice` for DI    |
| Templating       | Nunjucks (server-side) + React 16 (designer client SPA)                           |
| Validation       | Joi 17                                                                            |
| Session/cache    | `@hapi/yar` (cookie) + `@hapi/catbox-redis` / catbox-memory                       |
| Queue DB         | MySQL via Prisma 6 (`queue-model`) or pg-boss + PostgreSQL (`pgBossQueueService`) |
| CSS              | SASS compiled by `sass` CLI                                                       |
| Bundler          | Webpack 4 (designer client only)                                                  |
| Lint             | ESLint 7/8 + Prettier 2                                                           |
| Test (runner)    | `@hapi/lab` (legacy) + Jest 29; coverage threshold 83 %                           |
| Test (designer)  | `@hapi/lab` + Jest 26; separate client/server Jest configs                        |
| Test (model)     | Jest 29; coverage threshold 80 % branches / 89 % lines                            |
| E2E              | Playwright (runner `test:e2e`) + Cypress (`e2e/` workspace)                       |
| Auth             | `@hapi/bell` + `@hapi/jwt` + `@azure/msal-node`                                   |

### Key commands (from workspace root)

```
yarn setup              # install + build all packages
yarn build              # build all workspaces
yarn test               # test all workspaces
yarn lint               # lint all workspaces
yarn runner:start       # start runner (requires prior build)
yarn designer start:local   # start designer (ts-node-dev)
yarn model build        # build model (required first)
```

Per-package shortcuts:

- `yarn workspace @xgovformbuilder/runner test:jest` — Jest only in runner
- `yarn workspace @xgovformbuilder/runner unit-test` — Lab only in runner
- `yarn workspace @xgovformbuilder/model test-cov` — model Jest with coverage

## 3. Directory Layout

```
/
├── model/          Shared form-schema types, conditions engine, Joi validation, migration utils
├── queue-model/    Prisma client + MySQL schema for the submission retry queue
├── runner/         Hapi server that serves forms to end-users
├── designer/       Hapi server + React SPA for building forms
├── submitter/      Background service: dequeues failed submissions and retries webhook delivery
├── e2e/            Cypress end-to-end tests (cross-service)
├── docs/           ADRs, architecture diagrams, typedoc output
└── utils/          Repo-level scripts (e.g. cleanNonProdForms.js)
```

## 4. Entry Points

| Package        | File                                | What it does                                            |
| -------------- | ----------------------------------- | ------------------------------------------------------- |
| runner         | `runner/src/index.ts`               | Calls `createServer({})` then `server.start()`          |
| runner (built) | `runner/dist/index.js`              | Production start target (`yarn start`)                  |
| designer       | `designer/server/index.ts`          | Calls `createServer()` then `server.start()`            |
| submitter      | `submitter/src/submission/index.ts` | `setupDatabase()` + `createServer()` + `server.start()` |
| model          | `model/src/index.ts`                | Re-exports all model types; consumed as a library       |
| queue-model    | `queue-model/src/`                  | Exports Prisma client for `Submission` table            |
| runner CLI     | `runner/bin/run/`                   | oclif CLI: `check-forms` validates bundled JSON forms   |

## 5. Core Modules

### model (`@xgovformbuilder/model`)

| Sub-module                      | Responsibility                                         | Key exports                           |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| `schema/schema.ts`              | Joi schema for the entire form JSON — `FormDefinition` | `Schema`                              |
| `conditions/`                   | Condition AST: parse, evaluate, serialize              | `ConditionsModel`, `ConditionRawData` |
| `components/component-types.ts` | Enum of all component names                            | `ComponentTypes`                      |
| `data-model/`                   | Wrappers: `ConditionsWrapper`, `InputWrapper`          | `FormConfiguration`                   |
| `migration/`                    | Version-step migrations for stored form JSON           | `whichMigrations`, migration fns      |
| `featureFlags.ts`               | `hasFeatureFlag(flag, def)` — reads `process.env`      | `hasFeatureFlag`                      |

Depends on: `joi`, `boom`, `btoa`, `govuk-frontend` (types only).

### runner (`@xgovformbuilder/runner`)

#### `server/index.ts` — `createServer(routeConfig)`

Registers all plugins and services in order; returns a Hapi server. Depends on: all plugins below + all services.

#### `plugins/engine/`

The form execution engine:

- `plugin.ts` — Hapi plugin; registers GET/POST routes for `/{id}/{path*}`, `/{id}`, `/{id}/status`. Builds `FormModel` per loaded form JSON.
- `models/FormModel.ts` — Parses form JSON; instantiates `PageControllerBase` per page; evaluates conditions via `EvaluationContext`.
- `pageControllers/PageControllerBase.ts` — Base for all page controllers; handles GET (render nunjucks view) and POST (validate, advance state).
- `pageControllers/SummaryPageController.ts` — Summary/review page; triggers `Outputs` on submit.
- `models/submission/Outputs.ts` — Dispatches to `WebhookModel`, `NotifyModel`, `EmailModel`, `FeesModel`.
- `components/` — One class per component type (e.g. `TextField`, `DatePartsField`); `ComponentCollection` aggregates them.

#### `services/`

| Service                                                               | Purpose                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `cacheService.ts:CacheService`                                        | Redis/memory session store via catbox; freezes state on confirmation |
| `payService.ts:PayService`                                            | GOV.UK Pay integration (create/query payments)                       |
| `notifyService.ts:NotifyService`                                      | GOV.UK Notify email delivery                                         |
| `webhookService.ts:WebhookService`                                    | POST/PUT form data to configured webhook URLs                        |
| `emailService.ts`                                                     | SMTP email fallback                                                  |
| `addressService.ts` / `addressLookupService.ts`                       | Ordnance Survey address lookup                                       |
| `statusService.ts` / `pgBossQueueService.ts` / `mySqlQueueService.ts` | Queue-backed submission status                                       |
| `magicLinkCacheService.ts`                                            | Short-lived tokens for magic-link auth flow                          |
| `formSecurityService.ts`                                              | HMAC-based secure form submission                                    |
| `upload/uploadService.ts`                                             | File upload to `DOCUMENT_UPLOAD_API_URL`                             |

All services extend or implement `BaseService`; wired via schmervice (`server.registerService`).

#### `plugins/applicationStatus/`

Hapi plugin registering `GET /{id}/status`. Pre-handlers: `retryPay`, `handleUserWithConfirmationViewModel`, `checkUserCompletedSummary`.

#### `plugins/initialiseSession/`

JWT-validated session initialisation endpoint; pre-populates form state from a signed token.

### designer (`@xgovformbuilder/designer`)

#### `server/createServer.ts`

Registers: blankie, yar, vision, schmervice, persistenceService, designerPlugin, router, logging.

#### `server/lib/persistence/`

`PersistenceService` interface; implementations: `S3PersistenceService` (AWS S3), `BlobPersistenceService` (Azure Blob), `PreviewPersistenceService` (in-memory/preview mode). Selected at startup via `config.persistentBackend`.

#### `designer/client/` (React SPA)

Webpack 4 bundle. Entry: `client/index.tsx` (UNVERIFIED — not explicitly traced). State managed via React context (`StateContext`, `DataContext`). Key components: `ComponentCreate`, `PageEdit`, `LinkEdit`, `ConditionEdit`. Communicates with designer server via `client/api/designerApi.ts`.

### submitter

Standalone Hapi service. Polls the MySQL queue via Prisma (`queue-model`), retries webhook deliveries, and marks submissions complete/failed. Entry: `submitter/src/submission/index.ts`. Services: `QueueService`, `WebhookService`.

## 6. Data Flow — Form Submission (End to End)

1. **Load**: `configureEnginePlugin` reads JSON from `runner/src/server/forms/*.json` (or from designer publish endpoint in preview mode) → builds a `FormModel`.
2. **Navigate**: User GETs `/{formId}/{pagePath}` → `PageControllerBase.makeGetRouteHandler` looks up the page, renders a Nunjucks view with `ComponentCollection.getViewModel`.
3. **Validate**: User POSTs answers → `PageControllerBase.makePostRouteHandler` validates via Joi schemas on each component; on error re-renders with errors.
4. **Store**: Valid state is written to `CacheService` (Redis or memory) keyed by session ID.
5. **Summary**: User reaches `SummaryPageController` → `SummaryViewModel` reads all pages' state from cache; renders check-your-answers.
6. **Submit**: User confirms on summary page → `SummaryPageController` calls `Outputs` → dispatches to webhooks / Notify / email / Pay.
7. **Pay** (if configured): `PayService` creates GOV.UK Pay payment; user redirected; on return `applicationStatus` plugin checks payment state.
8. **Status**: `GET /{id}/status` shows confirmation page; `StatusService` (or `QueueStatusService`) checks delivery status.
9. **Queue retry**: If webhook delivery fails, submission is written to MySQL via `mySqlQueueService`; `submitter` polls and retries.

## 7. External Integrations

| Integration                       | Env Var(s)                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Redis (session)                   | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`                               |
| GOV.UK Pay                        | `PAY_API_URL`, `PAY_RETURN_URL`, `PAY_REFERENCE_LENGTH`                                 |
| GOV.UK Notify                     | `NOTIFY_API_KEY`, `NOTIFY_TEMPLATE_ID`, `FROM_EMAIL_ADDRESS`                            |
| Ordnance Survey                   | `ORDNANCE_SURVEY_KEY`                                                                   |
| Document upload API               | `DOCUMENT_UPLOAD_API_URL`                                                               |
| AWS S3 (designer persistence)     | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` (UNVERIFIED exact names)      |
| Azure Blob (designer persistence) | configured via `PERSISTENT_BACKEND=blob`                                                |
| MySQL queue DB                    | `QUEUE_DATABASE_URL`, `QUEUE_DATABASE_USERNAME`, `QUEUE_DATABASE_PASSWORD`              |
| MSAL / Azure AD auth              | `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_CLIENT_AUTH_URL`, `AUTH_CLIENT_TOKEN_URL` |
| Matomo analytics                  | `MATOMO_ID`, `MATOMO_URL`                                                               |
| Google Tag Manager                | `GTM_ID_1`, `GTM_ID_2`                                                                  |

Config is assembled via `node-config` (`runner/config/`) + env var mapping in `custom-environment-variables.json`. Validated at startup with Joi in `runner/src/server/utils/configSchema.ts`.

## 8. Conventions

| Area           | Convention                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error handling | Hapi Boom errors; `onPreResponse` lifecycle hook catches boom errors globally; no silent swallowing                                                                                                       |
| Validation     | Joi at HTTP boundary (config startup + page submission); `abortEarly: false` everywhere                                                                                                                   |
| Logging        | `pino` via `hapi-pino`; log redaction of PII fields via `openredaction`; `runner/src/server/utils/redactionTransport.js` wraps pino transport                                                             |
| DI             | `schmervice`: services registered on the Hapi server, retrieved in handlers via `request.services([])`                                                                                                    |
| Naming         | Plugins in `plugins/`, services in `services/`; page controllers named `*PageController.ts`; tests colocated as `__tests__/*.jest.ts` (Jest) or `*.test.*` (Lab)                                          |
| Session        | `@hapi/yar` cookie (base64json encoded); form state stored in catbox cache, not the cookie                                                                                                                |
| Config         | `node-config` layered: `default.js → {env}.json → custom-environment-variables.json`; Joi validates on boot                                                                                               |
| Test layout    | Unit tests colocated with source (`src/**/__tests__/*.jest.ts`); integration/server tests in `runner/test/cases/server/` (Lab); designer has separate `jest.client.config.js` and `jest.server.config.js` |

## 9. Testing

| Package  | Frameworks    | Where tests live                                              | Run a single test                                                                        |
| -------- | ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| runner   | Lab + Jest 29 | `runner/test/cases/` (Lab); `runner/src/**/__tests__/` (Jest) | `yarn workspace @xgovformbuilder/runner test:file test/cases/server/config.test.js`      |
| designer | Lab + Jest 26 | `designer/**/*.test.*`; `designer/client/**/__tests__/`       | `yarn workspace @xgovformbuilder/designer jest:client --testPathPattern=ComponentCreate` |
| model    | Jest 29       | `model/src/**/__tests__/`                                     | `cd model && npx jest --testPathPattern=conditions`                                      |

Known gaps: `runner/src/server/services/` has uneven coverage — several services (e.g. `gasTestKitApiService`, `riskReportApiService`, `trustPaymentsService`) have no colocated tests. Designer client React components have inconsistent test coverage (some components have `__tests__/`, many do not).

## 10. Risk Areas

- **Mixed test frameworks**: Both `@hapi/lab` (legacy) and Jest coexist in runner and designer; `test` script runs both and ORs failures — easy to miss a failing suite.
- **Babel-compiled TypeScript**: Neither runner nor designer use `tsc` for emit; type errors do not block the build. Run `yarn type-check` separately.
- **React 16 + Webpack 4**: Designer client is pinned to React 16.13.1 and Webpack 4; both are end-of-life. Upgrade is a large undertaking.
- **GOV.UK Frontend version mismatch**: Root workspace pins `govuk-frontend ^4.10.0`; runner's own dependency is `govuk-frontend ^5.10.2` — different major versions coexist.
- **Queue model Prisma schema**: `queue-model/schema.prisma` uses `provider = "mysql"` but runner also has `pgBossQueueService.ts` for PostgreSQL — the queue-model Prisma client is MySQL-only; pg-boss does not use it.
- **`submitter` workspace**: Listed in root `workspaces` but has no tests and no CI references found; it may be incomplete.
- **Security resolutions**: Many `resolutions` in root `package.json` pinning old transitive deps (e.g. `ssri ~6.0.2`, `y18n 4.0.1`); these suppress audit warnings but may not be the latest safe versions.
- **`PageControllerBase` size**: Over several hundred lines; handles GET, POST, validation, feedback, auth checks, HMAC tokens, address context — high complexity and fragile to change.
- **Designer `aws-sdk` v2**: Designer depends on `aws-sdk ^2` (EOL November 2023); runner does not share this dependency.
- **Nunjucks template paths**: `plugin.ts` sets Nunjucks paths relative to `__dirname` at runtime; misconfigured paths cause silent render failures (recent bug: page titles crashing on pages with no title).

## 11. Outdated Dependencies (observations only)

| Package                              | Current pin | Note                                                |
| ------------------------------------ | ----------- | --------------------------------------------------- |
| `react` / `react-dom`                | 16.13.1     | EOL; React 18 is current                            |
| `webpack`                            | ^4          | Webpack 5 is current                                |
| `aws-sdk` (designer)                 | ^2          | AWS SDK v2 is EOL                                   |
| `@hapi/lab` (designer)               | ^24         | Lab 25+ available                                   |
| `jest` (designer)                    | ^26         | Runner/model on ^29                                 |
| `govuk-frontend` (designer devDep)   | ^4.10.0     | Runner ships v5                                     |
| `enzyme` / `enzyme-adapter-react-16` | ^3          | Unmaintained; React Testing Library already present |
| `hapi-pino`                          | 8.0.0       | Pinned exact; newer minor versions available        |

## 12. Glossary

| Term                           | Meaning                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Form JSON / FormDefinition** | The JSON structure (`model/src/schema/schema.ts`) that describes all pages, components, conditions, and outputs of a form        |
| **FormModel**                  | Runtime representation of a FormDefinition; holds pages, conditions, and page-controller instances                               |
| **PageController**             | Server-side class responsible for one page's GET and POST route handlers                                                         |
| **Component**                  | A single field or content block on a page (e.g. `TextField`, `DatePartsField`, `CheckboxesField`)                                |
| **ComponentCollection**        | Container that groups the components on one page and coordinates validation                                                      |
| **Condition**                  | Boolean expression referencing field values; used to show/hide pages or fields                                                   |
| **Section**                    | A named group of pages; state is stored under the section key                                                                    |
| **Output**                     | A side-effect triggered on form submission: webhook, GOV.UK Notify email, SMTP email, or GOV.UK Pay payment                      |
| **SummaryPage**                | The check-your-answers page before final submission; triggers Outputs                                                            |
| **ApplicationStatus**          | The confirmation/status page shown after submission (`/{id}/status`)                                                             |
| **Persistence service**        | Designer-side storage for form JSON: S3, Azure Blob, or preview (in-memory)                                                      |
| **Queue / submitter**          | MySQL-backed retry mechanism for failed webhook deliveries                                                                       |
| **Magic link**                 | Email-based passwordless auth flow where a signed JWT link pre-populates a session                                               |
| **initialiseSession**          | JWT endpoint that pre-seeds form state (used for integrations that start a form from an external system)                         |
| **CCA / HPT / KLS / RPS**      | UKHSA service codes in form filenames (Contact Casing, Health Protection Team, Knowledge Library, Radiation Protection Sciences) |

---

Last verified: 2026-10-29 at commit 70dfc1d4
