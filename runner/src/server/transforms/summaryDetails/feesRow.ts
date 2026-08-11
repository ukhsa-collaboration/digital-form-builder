// Append the fee total as the final row of the last summary section
import { SummaryFeesRowConfig } from "@xgovformbuilder/model";
import { FeesModel } from "server/plugins/engine/models/submission";

export function applyFeesRow(
  details: any,
  fees: FeesModel | undefined,
  feesRow: SummaryFeesRowConfig | undefined
) {
  if (!feesRow?.enabled || !fees?.details?.length || !details.length) {
    return details;
  }

  const totalAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(fees.total / 100);

  return details.map((d: any, i: number) =>
    i === details.length - 1
      ? {
          ...d,
          items: [
            ...d.items,
            {
              name: "fees",
              label: feesRow.label ?? "Fees",
              value: totalAmount,
              immutable: true,
            },
          ],
        }
      : d
  );
}
