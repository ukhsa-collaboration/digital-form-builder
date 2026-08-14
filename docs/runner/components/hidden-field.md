# Hidden field

The hidden field allows you to embed non-visible data in a form page. It is not shown to the user and does not require any user input. When the page is submitted, the field's value is included in the form submission alongside visible fields.

## How it works

The value is resolved in this order:

1. `options.value` — a static value defined in the form JSON
2. The current value of the field in form state (e.g. set by [session initialisation](../session-initialisation.md) or a previous page)
3. An empty string if neither is present

The component is rendered as `<input type="hidden">` and produces no visible output.

## Configuration

Add a component with `"type": "HiddenField"` to a page's `components` array.

To embed a static value, set `options.value`:

```json5
{
  name: "addressType",
  type: "HiddenField",
  options: {
    value: "residential",
  },
}
```

To carry a value that was set earlier in the session (for example, by session initialisation or a previous page), omit `options.value`:

```json5
{
  name: "selectedReportAddress",
  type: "HiddenField",
  options: {},
}
```

## Options

| Option            | Type      | Description                                                                                         | Default |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------- | ------- |
| `value`           | `string`  | A static value to embed. If omitted, the current value in form state is used.                       | —       |
| `exposeToContext` | `boolean` | Expose the field's value to the nunjucks template context for use in [templating](./templating.md). | `false` |
