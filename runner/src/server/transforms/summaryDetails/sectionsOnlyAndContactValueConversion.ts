interface detail {
  name: string;
  title: string;
  items: Array<any>;
}

export function sectionsOnlyAndContactValueConversion(details) {
  return details
    .filter((detail: detail) => detail.name)
    .map((detail: detail) => {
      console.log(detail);
      
      let { items } = detail;
      const findItem = (name: string) =>
        detail.items.find((item) => item.name === name);
      const valuesToString = (arrayOfKeys: Array<string>, joiner: string) =>
        arrayOfKeys.map((name) => findItem(name).value).join(joiner);

      if (findItem("first_name")) {
        items = [
          {
            ...detail.items[0],
            name: "full_name",
            label: "Full name",
            title: "Full name",
            rawValue: "Full name",
            value: `${valuesToString(["first_name", "last_name"], " ")}`,
          },
          {
            ...detail.items[0],
            name: "contact_details",
            label: "Contact details",
            title: "Contact details",
            rawValue: "Contact details",
            value: `${valuesToString(["phone_number", "email_address"], "\n")}`,
          },
        ];
      }

      const { url } = detail.items[0];
      const card = detail.name.match(/\w\d/) ? { card: url } : {};
      return { ...detail, items, ...card };
    });
}
