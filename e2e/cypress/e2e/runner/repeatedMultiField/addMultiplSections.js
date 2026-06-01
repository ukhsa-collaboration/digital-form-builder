import { Then } from "@badeball/cypress-cucumber-preprocessor";

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
    cy.findByRole("heading", { name: cardTitle })
      .parents(".govuk-summary-card")
      .within(() => {
        cy.findAllByRole("link", { name: new RegExp(linkText, "i") })
          .first()
          .should("have.attr", "href")
          .and("include", hrefFragment);
      });
  }
);

// Click the delete button on a specific card
When("I delete the summary card {string}", (cardTitle) => {
  cy.findByRole("heading", { name: cardTitle })
    .parents(".govuk-summary-card")
    .within(() => {
      cy.findByRole("button", { name: /delete/i }).click();
    });
});

// Click the edit button on a specific card
When("I edit the summary card {string}", (cardTitle) => {
  cy.findByRole("heading", { name: cardTitle })
    .parents(".govuk-summary-card")
    .within(() => {
      cy.findByRole("link", { name: /edit/i }).click();
    });
});
