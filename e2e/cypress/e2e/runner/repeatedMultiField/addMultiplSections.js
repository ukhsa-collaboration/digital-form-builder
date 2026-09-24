import { Then, When } from "@badeball/cypress-cucumber-preprocessor";

Then("I see a summary card titled {string}", (cardTitle) => {
  cy.findByRole("heading", { name: cardTitle }).should("exist");
});

Then(
  "the summary card {string} contains a row {string} with value {string}",
  (cardTitle, rowLabel, rowValue) => {
    cy.findByRole("heading", { name: cardTitle })
      .parents(".govuk-summary-card")
      .within(() => {
        cy.contains("dt", rowLabel).next("dd").should("contain.text", rowValue);
      });
  }
);

Then(
  "the summary card {string} has a {string} link to {string}",
  (cardTitle, linkText, hrefFragment) => {
    const name = linkText.includes(cardTitle)
      ? linkText
      : `${linkText} ${cardTitle}`;

    cy.findByRole("heading", { name: cardTitle })
      .parents(".govuk-summary-card")
      .within(() => {
        cy.findByRole("link", { name })
          .should("have.attr", "href")
          .then((href) => {
            const actual = new URL(href, window.location.origin).searchParams;
            const expected = new URLSearchParams(hrefFragment.split("?")[1]);

            expected.forEach((value, key) => {
              expect(actual.get(key), `query param "${key}"`).to.equal(value);
            });
          });
      });
  }
);

// Click the delete button on a specific card
When("I delete the summary card {string}", (cardTitle) => {
  cy.findByRole("heading", { name: cardTitle })
    .parents(".govuk-summary-card")
    .within(() => {
      cy.findByRole("link", { name: /Delete/i }).click();
    });
});

// Click the edit button on a specific card
When("I edit the summary card {string}", (cardTitle) => {
  cy.findByRole("heading", { name: cardTitle })
    .parents(".govuk-summary-card")
    .within(() => {
      cy.findByRole("link", {
        name: new RegExp(`Change ${cardTitle}`, "i"),
      }).click();
    });
});
