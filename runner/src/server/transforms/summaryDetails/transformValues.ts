// Replace the display value of rows based on field name and matched raw value

export function transformValues(
  details: any,
  valueTransforms: Record<string, Record<string, string>>
) {
  return details.map(
    (detail: { name: string; title: string; items: Array<any> }) => ({
      ...detail,
      items: detail.items.map((item: any) => {
        const map = valueTransforms[item.name];
        const replacement = map?.[String(item.rawValue)];
        return replacement !== undefined
          ? { ...item, value: replacement }
          : item;
      }),
    })
  );
}
