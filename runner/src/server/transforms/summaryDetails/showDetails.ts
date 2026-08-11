// Change Address Lookup rows from summary details

export function showDetails<TItem = unknown>(
  details: { name: string; title: string; items: TItem[] }[]
) {
  return details.map((detail) => {
    const items = detail.items;
    return { ...detail, items: items };
  });
}
