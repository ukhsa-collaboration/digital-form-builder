Feature: Repeating multi field - add multiple sections

  Background:
    Given the form "repeat-multi-field" exists

  Scenario: User can repeat sections with multiple fields
    When I enter "Alice" for "Your name"
    And I enter "French" for "Language"
    And I continue
    And I continue
    And I enter "Alice" for "Your name"
    And I enter "Italian" for "Which languages do you translate or interpret?"
    Then I don't see "French"
    When I continue
    Then I see "You have selected these languages"
    And I see "French"
    And I see "Italian"
    When I continue
    Then I see "Check your answers"
    And I see "French, Italian"