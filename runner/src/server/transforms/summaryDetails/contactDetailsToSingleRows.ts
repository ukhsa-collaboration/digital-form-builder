export function contactDetailsToSingleRows(
  details: Array<{ name: string; title: string; items: Array<any> }>,
  nameFields: Array<string>,
  contactFields: Array<string>
) {
  return details.map((detail) => {
    const findItem = (name: string) =>
      detail.items.find((item) => item.name === name);

    const detailItem = (name: string, array: Array<string>, joiner: string) => {
      return {
        ...detail.items[0],
        name: name.toLowerCase().replace(" ", "_"),
        label: name,
        title: name,
        rawValue: name,
        value:
          array.map((name) => findItem(name).value).join(joiner) === joiner
            ? "Not supplied"
            : array.map((name) => findItem(name).value).join(joiner),
      };
    };

    if (findItem(nameFields[0])) {
      const items = [
        detailItem("Full name", nameFields, " "),
        detailItem("Contact details", contactFields, "\n"),
      ];
      return { ...detail, items };
    }

    return detail;
  });
}
