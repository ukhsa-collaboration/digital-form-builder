Feature: Repeating multi field - add multiple sections

  Background:
    Given the form "repeat-multi-field" exists

  Scenario: User can repeat sections with multiple fields
    When I enter "Alice" for "Your name"
    And I enter "French" for "Language"
    Then I see "You have selected these Interpreters"
    And I select the button "Continue"
    And I select the button "Add another"
    And I enter "Bob{enter}" for "Your name"
    And I enter "Italian" for "Language"
    Then I don't see "French"
    And I select the button "Continue"
    Then I see "You have selected these Interpreters"
    And I see "French"
    And I see "Italian"
    When I continue
    Then I see "Check your answers"
    And I see "French, Italian"