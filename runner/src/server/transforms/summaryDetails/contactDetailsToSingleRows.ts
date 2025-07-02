export function contactDetailsToSingleRows(
  details: Array<{ name: string; title: string; items: Array<any> }>,
  nameFields: Array<string>,
  contactFields: Array<string>
) {
  return details.map((detail) => {
    const findItem = (name: string) =>
      detail.items.find((item) => item.name === name);
    const valuesToString = (arrayOfKeys: Array<string>, joiner: string) =>
      arrayOfKeys.map((name) => findItem(name).value).join(joiner);

    if (findItem("first_name")) {
      const items = [
        {
          ...detail.items[0],
          name: "full_name",
          label: "Full name",
          title: "Full name",
          rawValue: "Name fields",
          value: `${valuesToString(nameFields, " ")}`,
        },
        {
          ...detail.items[0],
          name: "contact_details",
          label: "Contact details",
          title: "Contact details",
          rawValue: "Contact detail fields",
          value: `${valuesToString(contactFields, "\n")}`,
        },
      ];
      return { ...detail, items };
    }

    return detail;
  });
}
