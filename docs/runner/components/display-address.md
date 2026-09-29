# Display address

The display address component renders a previously collected address from form state, formatting it so that each address line appears on its own line.

## How it works

The `content` field is a [nunjucks](https://mozilla.github.io/nunjucks/) template string rendered against the current form data at the time the page is shown. After rendering, commas in the output are replaced with `<br>` tags, so a comma-separated address string is displayed with each part on a new line.

## Configuration

Add a component with `"type": "DisplayAddress"` to a page's `components` array. Set `content` to a nunjucks expression that references the address value in form state:

```json5
{
  name: "reportAddress_matchedAddressDisplay",
  type: "DisplayAddress",
  content: "{{ reportAddress_matchedAddress.address }}",
  options: {},
}
```

The referenced value should be a comma-separated address string (e.g. `"10 Downing Street, London, SW1A 2AA"`). The component renders each comma-separated part on a new line.

A `condition` can be applied to show the component only when a specific condition is met:

```json5
{
  name: "reportAddress_matchedAddressDisplay",
  type: "DisplayAddress",
  content: "{{ reportAddress_matchedAddress.address }}",
  options: {
    condition: "hasMatchedAddress",
  },
}
```

## Options

| Option      | Type     | Description                                                             | Default |
| ----------- | -------- | ----------------------------------------------------------------------- | ------- |
| `condition` | `string` | A condition expression that controls whether the component is rendered. | —       |
