# Summary lists

The summary lists component renders one or more GOV.UK summary lists on a page, built from content defined in the form JSON. It is typically used on review or confirmation pages to display structured information alongside "Change" links.

## How it works

Each section in the form definition maps to one `govukSummaryList`. Each item in a section produces a row with a key, value, and optional "Change" action link.

Values can be:

- A nunjucks template string rendered against current form state
- A display component (e.g. `DisplayAddress`) whose macro is rendered inline as HTML in the summary cell
- A form field component (e.g. `DatePartsField`, `UkAddressField`) whose state value is formatted to a plain text representation

Change URLs are prepended with the form's `basePath` and a `returnUrl` query parameter pointing back to the summary page, so the user is returned after making a change.

Fee data is automatically injected into the nunjucks template context under a `fees` key, so row values can reference `{{ fees.total }}` or individual fee items without any additional configuration.

## Configuration

Add a component with `"type": "SummaryLists"` to a page's `components` array. Provide a `content` array of sections, each with a `title` and a `content` array of rows:

```json5
{
  name: "applicationSummary",
  type: "SummaryLists",
  content: [
    {
      title: "Your details",
      content: [
        {
          title: "Full name",
          value: "{{ fullName }}",
          changeUrl: "/applicant-name",
        },
        {
          title: "Date of birth",
          type: "component",
          value: {
            type: "DatePartsField",
            name: "dateOfBirth",
          },
          changeUrl: "/date-of-birth",
        },
      ],
    },
  ],
  options: {},
}
```

### Hiding change links

Set `changeUrl` to `false` to display a row without a "Change" action:

```json5
{
  title: "Application reference",
  value: "{{ referenceNumber }}",
  changeUrl: false,
}
```

### Conditional change URL

`changeUrl` can be an array of conditional cases. The first case whose `condition` evaluates to `true` against the current form state is used. A case without a `condition` acts as an unconditional fallback:

```json5
{
  title: "Address",
  value: "{{ address }}",
  changeUrl: [
    { condition: "isOverseas", value: "/overseas-address" },
    { value: "/uk-address" },
  ],
}
```

### Display components as row values

Set `type: "component"` on a row and provide a `SummaryContentComponent` object as `value` to render a display component inside the summary cell. The component's nunjucks macro is invoked inline as HTML:

```json5
{
  title: "Address",
  type: "component",
  value: {
    type: "DisplayAddress",
    name: "matchedAddress",
    content: "{{ matchedAddress.address }}",
  },
  changeUrl: "/address-lookup",
}
```

Any component type registered in the component index that does not extend `FormComponent` is supported (e.g. `DisplayAddress`, `Html`, `Details`).

### Form field components as row values

Form field components can also appear as row values. Their raw state values are formatted as plain text rather than rendered as input widgets:

| Component type                        | Formatted output                                   |
| ------------------------------------- | -------------------------------------------------- |
| `DatePartsField`, `DateField`         | `d MMMM yyyy` (e.g. `1 January 2024`)              |
| `DateTimePartsField`, `DateTimeField` | `d MMMM yyyy h:mm`                                 |
| `UkAddressField`                      | Comma-separated address lines, empty parts omitted |
| `MonthYearField`                      | `Month Year` (e.g. `January 2024`)                 |
| `CheckboxesField`                     | Comma-separated raw values                         |
| All others                            | Raw string from form state                         |

```json5
{
  title: "Date of birth",
  type: "component",
  value: {
    type: "DatePartsField",
    name: "dateOfBirth",
  },
  changeUrl: "/date-of-birth",
}
```

### Conditional component content

When a row value is a component, its `content` field can be an array of conditional cases. The first matching case is passed to the component as its resolved `content`:

```json5
{
  title: "Address",
  type: "component",
  value: {
    type: "DisplayAddress",
    name: "address",
    content: [
      { condition: "isOverseas", value: "{{ overseasAddress }}" },
      { value: "{{ ukAddress.address }}" },
    ],
  },
  changeUrl: "/address",
}
```

### Summary cards

Enable GOV.UK summary cards by setting `options.enableCards` to `true`. Each section is wrapped in a card using the section's `title` as the card heading:

```json5
{
  name: "applicationSummary",
  type: "SummaryLists",
  content: [
    {
      title: "Your details",
      content: [
        {
          title: "Full name",
          value: "{{ fullName }}",
          changeUrl: "/applicant-name",
        },
      ],
    },
    {
      title: "Fees",
      content: [
        {
          title: "Total",
          value: "£{{ fees.total }}",
          changeUrl: false,
        },
      ],
    },
  ],
  options: {
    enableCards: true,
  },
}
```

### Using fee data

The component automatically injects the current fee model into the template context under `fees`. Row values can reference fee data directly without any extra configuration:

```json5
{
  title: "Application fee",
  value: "£{{ fees.total }}",
  changeUrl: false,
}
```

## Options

| Option        | Type                           | Description                                                                             | Default |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------------- | ------- |
| `enableCards` | `boolean \| "true" \| "false"` | Wrap each section in a GOV.UK summary card using the section title as the card heading. | `false` |
