Feature: Repeating multi field - add multiple sections

  Background:
    Given the form "repeat-multi-field" exists

  Scenario: User can repeat sections with multiple fields
    When I enter "Alice" for "Your name"
    And I enter "French{enter}" for "Language"
    And I select the button "Continue"
    Then I see "You have selected these Interpreters"
    And I select the button "Add another"
    Then I don't see "French"
    Then I don't see "Alice"
    And I enter "Bob{enter}" for "Your name"
    And I enter "Italian" for "Language"
    And I select the button "Continue"
    Then I see "You have selected these Interpreters"
    Then I see a summary card titled "Item 1"
    And the summary card "Item 1" contains a row "Your name" with value "Alice"
    And the summary card "Item 1" contains a row "Language" with value "French"
    And the summary card "Item 1" has a "Change" link to "?view=0"
    And the summary card "Item 1" has a "Remove" link to "?remove=0"
    Then I see a summary card titled "Item 2"
    And the summary card "Item 2" contains a row "Your name" with value "Bob"
    And the summary card "Item 2" contains a row "Language" with value "Italian"
    And the summary card "Item 2" has a "Change" link to "?view=1"
    And the summary card "Item 2" has a "Remove" link to "?remove=1"