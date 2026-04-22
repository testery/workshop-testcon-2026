Feature: Manage employees

  Background:
    Given a unique test run id
    And I am on the Employees page

  Scenario: Add a new employee
    When I add an employee with first name "Alice" last name "Anderson" age "30"
    Then I should see an employee row for "Alice" "Anderson" with age "30"

  Scenario: Edit an employee
    Given an employee exists with first name "Bob" last name "Brown" age "40"
    When I edit the employee "Bob" "Brown" setting age to "41"
    Then I should see an employee row for "Bob" "Brown" with age "41"

  Scenario: Assign a supervisor to an employee
    Given an employee exists with first name "Carol" last name "Clark" age "50"
    And an employee exists with first name "Dave" last name "Davis" age "28"
    When I edit the employee "Dave" "Davis" setting supervisor to "Carol" "Clark"
    Then the employee "Dave" "Davis" should show supervisor "Carol Clark"

  Scenario: Remove an employee
    Given an employee exists with first name "Erin" last name "Evans" age "35"
    When I delete the employee "Erin" "Evans"
    Then I should not see an employee row for "Erin" "Evans"
