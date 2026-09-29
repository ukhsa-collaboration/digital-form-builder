import Lab from "@hapi/lab";
import { expect } from "@hapi/code";
import { applyFeesRow } from "../../summaryDetails/feesRow";
const { test, suite } = (exports.lab = Lab.script());

suite("applyFeesRow", () => {
  const details = [
    { name: "Detail1", title: "Detail 1", items: [{ name: "a", value: "1" }] },
    { name: "Detail2", title: "Detail 2", items: [{ name: "b", value: "2" }] },
  ];

  const fees = {
    details: [{ description: "Fee", amount: 500 }],
    total: 500,
    prefixes: [],
  };

  test("appends a fees row to the last section when enabled", () => {
    const result = applyFeesRow(details, fees, { enabled: true });
    expect(result[1].items).to.have.length(2);
    expect(result[1].items[1]).to.equal({
      name: "fees",
      label: "Fees",
      value: "£5.00",
      immutable: true,
    });
    expect(result[0].items).to.have.length(1);
  });

  test("uses a custom label when provided", () => {
    const result = applyFeesRow(details, fees, {
      enabled: true,
      label: "Total to pay",
    });
    expect(result[1].items[1].label).to.equal("Total to pay");
  });

  test("returns details unchanged when feesRow is not enabled", () => {
    const result = applyFeesRow(details, fees, { enabled: false });
    expect(result).to.equal(details);
  });

  test("returns details unchanged when there are no fee details", () => {
    const result = applyFeesRow(
      details,
      { details: [], total: 0, prefixes: [] },
      { enabled: true }
    );
    expect(result).to.equal(details);
  });

  test("returns details unchanged when feesRow config is undefined", () => {
    const result = applyFeesRow(details, fees, undefined);
    expect(result).to.equal(details);
  });
});
