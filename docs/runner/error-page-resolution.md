# Error page resolution

The runner can serve different error pages per-project (and per group of projects), instead of
falling back to one generic error page for every form hosted by the runner.

## Throwing an application error

Two error classes are available from [`errors.ts`](../../runner/src/server/plugins/engine/errors.ts)
for code that needs to control how an error is displayed:

- `RenderingError`: thrown by the engine itself (e.g. no form or page found for a given id/path).
  Takes a `code` (HTTP status code).
- `ControllerError`: thrown from page controllers when a server-side action fails (e.g. a lookup
  in a page's `onGet`/`onPost` handler). Takes a `code`, and an optional `page` which names a
  specific view to render instead of the generic status-code view.

```ts
import { ControllerError } from "server/plugins/engine/errors";

throw new ControllerError("Failed to find address", {
  code: 500,
  page: "example-error",
});
```

Both classes are Boom errors under the hood, so throwing one still results in a Boom response
that hapi's `onPreResponse` extension can intercept.

## Resolving the view

The resolution logic lives in [`errorPages.ts`](../../runner/src/server/plugins/errorPages.ts),
registered as the `error-pages` plugin's `onPreResponse` handler. For every Boom response it:

1. Extracts the **form id** from the first segment of the request path
   (`extractFormIdFromPath`), e.g. `/my-form/page-one` → `my-form`.
2. Looks up `server.app.forms[formId]` to get the form's model, and reads its **group** from
   `form.def.formGroup` (the optional `formGroup` field on the form JSON).
3. If the thrown error's message identifies it as a `ControllerError` or `RenderingError`, it is
   treated as an **application error** and handled by `handleApplicationError`, which resolves a
   view by checking, in order, most-to-least specific:
   - `page` view (from `ControllerErrorMetadata.page`, if provided) in the **form** folder,
     then the **group** folder, then the generic `views/` folder.
   - if no `page` view exists (or none was set on the error), the same lookup is repeated using
     the numeric status **code** (e.g. `404`) as the view name.
   - if none of those exist, the status code itself is used as the view name, which resolves to
     the existing top-level view (e.g. `views/404.html`).
4. Any other Boom error falls back to the pre-existing behaviour:
   - a `403` renders `csrf-protection` (CSRF token failures), passing the form id and form
     name into the view.
   - anything else renders the generic `500` view, passing the form name (or the configured
     `serviceName`) into the view.
5. If a form cannot be resolved for the form id (e.g. the path doesn't map to a known form),
   resolution falls back to the plain `500` view with no form context.

## View lookup order

Given a form id, an optional group, and a view name (either a `page` name or a status code),
`findView` checks folders under `runner/src/server/views/` in this order and returns the first
one that exists on disk:

```
views/<PROJECT_ID>/<name>.html
views/<GROUP>/<name>.html
views/<name>.html
```

For example, a `RenderingError` with `code: 404` thrown while serving a form with id
`my-form` and form group `my-form-group` will look for:

```
views/my-form/404.html
views/my-form-group/404.html
views/404.html
```

A `ControllerError` with `code: 500, page: "example-error"` thrown in the same context will
first look for:

```
views/my-form/example-error.html
views/my-form-group/example-error.html
views/example-error.html
```

and only fall back to the `500` lookup above if none of the `example-error.html` files exist.

## Adding a form or form group error page

Add an `.html` view under a folder matching the `formId` or `formGroup` value, using the same name
(`<code>.html` or a custom page name) as an existing generic view. No registration is required;
`findView` checks for the file's existence on disk at error time via `fs.existsSync`.

```
runner/src/server/views/
├── 404.html                 # generic fallback
├── my-form-group/
│   └── 404.html             # shared by all forms with form group: "my-form-group"
└── my-form/
    └── 404.html             # used only by the "my-form" project
```
