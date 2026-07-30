// Change Address Lookup rows from summary details

export function showDetails(details: any) {
  return details.map(
    (detail: { name: string; title: string; items: Array<any> }) => {
      const items = detail.items;
      return { ...detail, items: items };
    }
  );
}
