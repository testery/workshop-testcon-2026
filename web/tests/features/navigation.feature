Feature: App navigation

  Scenario: User can navigate to the Employees page
    Given I am on the home page
    When I click the "Employees" menu item
    Then I should see the "Employees" heading

  Scenario: Authenticated user is shown in the header
    Given I am on the home page
    Then the user menu button should show "Demo User"

  Scenario: Unauthenticated User Sees Login Page
    Given I am unauthenticated
    When I visit a secure page
    Then I am redirected to the login page

  Scenario: User Visits the Dashboard
    Given I am on the home page
    When I click the "Dashboard" menu item
    Then I should see the "Dashboard" heading
    And I should see the count of employees