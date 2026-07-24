// Change Address Lookup rows from summary details

export function showDetails(
  details: any,
) {
  console.log("logging details in showDetails: ");
  return details.map(
    (detail: { name: string; title: string; items: Array<any> }) => {
      const items = detail.items;
      console.log("detail name:", detail.name);
      console.log("detail title:", detail.title);
      console.log("detail items:",detail.items);
      return { ...detail, items: items };
    }
  );
}