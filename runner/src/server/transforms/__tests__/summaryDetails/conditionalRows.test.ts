import Lab from "@hapi/lab";
import { expect } from "@hapi/code";
import { applyConditionalRows } from "../../summaryDetails/conditionalRows";
const { test, suite } = (exports.lab = Lab.script());

suite("applyConditionalRows", () => {
  const buildDetails = () => [
    {
      name: "Detail1",
      title: "Detail 1",
      items: [
        {
          name: "hasPet",
          title: "Do you have a pet",
          value: "Yes",
          rawValue: "Yes",
        },
        { name: "petName", title: "Pet name", value: "Rex", rawValue: "Rex" },
      ],
    },
  ];

  test("leaves fields untouched when the condition does not match", () => {
    const details = buildDetails();
    const result = applyConditionalRows(details, [
      { when: { field: "hasPet", value: "No" }, removeFields: ["petName"] },
    ]);
    expect(result[0].items.map((i: any) => i.name)).to.equal([
      "hasPet",
      "petName",
    ]);
  });

  test("removes fields when the condition matches", () => {
    const details = buildDetails();
    const result = applyConditionalRows(details, [
      { when: { field: "hasPet", value: "Yes" }, removeFields: ["petName"] },
    ]);
    expect(result[0].items.map((i: any) => i.name)).to.equal(["hasPet"]);
  });

  test("treats a missing/empty field as matching when isEmpty is true", () => {
    const details = [
      {
        name: "Detail1",
        title: "Detail 1",
        items: [{ name: "middleName", title: "Middle name", rawValue: "" }],
      },
    ];
    const result = applyConditionalRows(details, [
      {
        when: { field: "middleName", isEmpty: true },
        appendToLastSection: {
          name: "noMiddleName",
          label: "Middle name",
          value: "Not provided",
        },
      },
    ]);
    expect(result[0].items).to.have.length(2);
    expect(result[0].items[1]).to.equal({
      name: "noMiddleName",
      label: "Middle name",
      value: "Not provided",
    });
  });

  test("does not append when the condition does not match", () => {
    const details = buildDetails();
    const result = applyConditionalRows(details, [
      {
        when: { field: "hasPet", value: "No" },
        appendToLastSection: {
          name: "extra",
          label: "Extra",
          value: "should not appear",
        },
      },
    ]);
    expect(result[0].items).to.have.length(2);
  });
});
