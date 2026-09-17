import Lab from "@hapi/lab";
import { expect } from "@hapi/code";
import { transformValues } from "../../summaryDetails/transformValues";
const { test, suite } = (exports.lab = Lab.script());

suite("transformValues", () => {
  const details = [
    {
      name: "Detail1",
      title: "Detail 1",
      items: [
        {
          name: "deliveryMethod",
          title: "How would you like to receive your report",
          label: "Delivery method",
          value: "Email (£3.90) - delivered instantly",
          rawValue: "Email",
          url: "/how-would-you-like-to-receive-your-report",
        },
        {
          name: "first_name",
          title: "First name",
          label: "First name",
          value: "Joe",
          rawValue: "Joe",
          url: "/namePage",
        },
      ],
    },
  ];

  const valueTransforms = {
    deliveryMethod: {
      Email: "Email",
      Post: "Post",
    },
  };

  test("replaces the value of a matched field/rawValue pair", () => {
    expect(transformValues(details, valueTransforms)).to.equal([
      {
        name: "Detail1",
        title: "Detail 1",
        items: [
          {
            name: "deliveryMethod",
            title: "How would you like to receive your report",
            label: "Delivery method",
            value: "Email",
            rawValue: "Email",
            url: "/how-would-you-like-to-receive-your-report",
          },
          {
            name: "first_name",
            title: "First name",
            label: "First name",
            value: "Joe",
            rawValue: "Joe",
            url: "/namePage",
          },
        ],
      },
    ]);
  });

  test("leaves items unchanged when the field has no transform", () => {
    const noMatchingField = {
      otherField: { Email: "Email" },
    };

    expect(transformValues(details, noMatchingField)).to.equal(details);
  });

  test("leaves items unchanged when the rawValue is not in the map", () => {
    const noMatchingValue = {
      deliveryMethod: { Fax: "Fax" },
    };

    expect(transformValues(details, noMatchingValue)).to.equal(details);
  });
});
