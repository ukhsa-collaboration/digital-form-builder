export function convertDetailsForCloseContact(
  details: Array<{ name: string; title: string; items: Array<any> }>
) {
  const valuesToString = (sectionName: string) => {
    return details
      .find((section) => section.name === sectionName)!
      .items.filter((item) => item.value)
      .map((item) => item.value)
      .join("\n")
      .replace("\n", " ");
  };

  const detailItem = (person: string, sectionName: string, url: string) => {
    return {
      name: `${person}Details`,
      path: url,
      label: `${person} details`,
      value: valuesToString(sectionName),
      rawValue: valuesToString(sectionName),
      options: {},
      url: `/close-contact-form${url}?returnUrl=%2Fclose-contact-form%2Fsummary`,
      pageId: `/close-contact-form${url}`,
      type: "TextField",
      title: `${person} details`,
      dataType: "text",
    };
  };

  const nonSectionAnswer = (itemName: string) =>
    details[0].items.find((item) => item.name === itemName);

  return [
    {
      name: "PersonalDetails",
      title: "Personal details",
      items: [
        detailItem("Your", "PersonalDetails", "/personal-details"),
        nonSectionAnswer("completing_form_for"),
        ...(nonSectionAnswer("who_should_we_contact")
          ? [
              detailItem("Their", "OtherPersonDetails", "/other-persons-details"),
              nonSectionAnswer("who_should_we_contact"),
            ]
          : []),
      ],
    },
    ...(nonSectionAnswer("case_id")
      ? [
          {
            name: "CaseDetails",
            title: "Case details",
            items: [nonSectionAnswer("case_id")],
          },
        ]
      : []),
    {
      name: "CloseContacts",
      title: "Close contacts",
      items: [nonSectionAnswer("been_in_contact")],
    },
  ].concat(
    details
      .filter((sect) => sect.name && sect.name.includes("CloseContact"))
      .map((section) => {
        const items = section.items.map((item) => {
          return { ...item, immutable: true };
        });
        return { ...section, items, url: items[0].url, card: true };
      })
  );
}
