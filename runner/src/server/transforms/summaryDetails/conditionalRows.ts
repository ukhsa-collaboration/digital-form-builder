// Remove or append rows on the summary based on a configured field's value
import { SummaryConditionalRow } from "@xgovformbuilder/model";
import { removeRows } from "./removeRows";

export function applyConditionalRows(
  details: any,
  conditionalRows: Array<SummaryConditionalRow>
) {
  // Snapshot all items before iterating so rule order doesn't affect
  // which `when` conditions are evaluated.
  const allItems = details.flatMap((d: any) => d.items);
  const itemsByName = new Map(allItems.map((item: any) => [item.name, item]));

  let transformed = details;

  for (const rule of conditionalRows) {
    const match: any = itemsByName.get(rule.when.field);

    const conditionMatches =
      rule.when.isEmpty === true
        ? match == null || match.rawValue == null || match.rawValue === ""
        : match?.rawValue === rule.when.value;

    if (!conditionMatches) continue;

    if (rule.removeFields?.length) {
      transformed = removeRows(transformed, rule.removeFields);
    }

    if (rule.appendToLastSection) {
      transformed = transformed.map((d: any, i: number) =>
        i === transformed.length - 1
          ? { ...d, items: [...d.items, rule.appendToLastSection] }
          : d
      );
    }
  }

  return transformed;
}
