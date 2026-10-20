Feature: Customers, Products, and Orders

  Background:
    Given a unique test run id

  Scenario: Add a customer with profile
    Given I am on the Customers page
    When I add a customer with first name "Ada" last name "Lovelace" email "ada@example.com" phone "555-0100" address "1 Analytical Way"
    Then I should see a customer row for "Ada" "Lovelace" with email "ada@example.com"
    And the customer "Ada" "Lovelace" should show phone "555-0100"

  Scenario: Add a customer with notes
    Given I am on the Customers page
    When I add a customer with first name "Kate" last name "Notes" email "kate@example.com" notes "Prefers email contact"
    Then the customer "Kate" "Notes" should show notes "Prefers email contact"

  Scenario: Edit a customer's profile
    Given I am on the Customers page
    And a customer exists with first name "Grace" last name "Hopper" email "grace@example.com"
    When I edit the customer "Grace" "Hopper" setting phone to "555-0200"
    Then the customer "Grace" "Hopper" should show phone "555-0200"

  Scenario: Delete a customer
    Given I am on the Customers page
    And a customer exists with first name "Alan" last name "Turing" email "alan@example.com"
    When I delete the customer "Alan" "Turing"
    Then I should not see a customer row for "Alan" "Turing"

  Scenario: Add a product
    Given I am on the Products page
    When I add a product with name "Widget" price "9.99"
    Then I should see a product row for "Widget" with price "9.99"

  Scenario: Edit a product price
    Given I am on the Products page
    And a product exists with name "Gadget" price "5.00"
    When I edit the product "Gadget" setting price to "7.50"
    Then I should see a product row for "Gadget" with price "7.50"

  Scenario: Create an order for a customer with multiple products
    Given I am on the Customers page
    And a customer exists with first name "Ada" last name "Lovelace" email "ada@example.com"
    Given I am on the Products page
    And a product exists with name "Widget" price "10.00"
    And a product exists with name "Gadget" price "5.00"
    Given I am on the Orders page
    When I create an order for "Ada" "Lovelace" with products:
      | product | quantity |
      | Widget  | 2        |
      | Gadget  | 1        |
    Then I should see an order for "Ada Lovelace" with total "25.00"

  Scenario: Delete an order
    Given I am on the Customers page
    And a customer exists with first name "Bob" last name "Byte" email "bob@example.com"
    Given I am on the Products page
    And a product exists with name "Sprocket" price "3.00"
    Given I am on the Orders page
    And an order exists for "Bob" "Byte" with product "Sprocket" quantity "1"
    When I delete the most recent order for "Bob Byte"
    Then I should not see an order for "Bob Byte"

  Scenario: View an order's details
    Given I am on the Customers page
    And a customer exists with first name "Doug" last name "Dot" email "doug@example.com"
    Given I am on the Products page
    And a product exists with name "Bolt" price "2.00"
    Given I am on the Orders page
    And an order exists for "Doug" "Dot" with product "Bolt" quantity "3"
    When I open the most recent order for "Doug Dot"
    Then I should be on the order detail page for "Doug Dot"
    And the order detail total should be "6.00"

  Scenario: Edit items from the order detail page
    Given I am on the Customers page
    And a customer exists with first name "Eve" last name "Echo" email "eve@example.com"
    Given I am on the Products page
    And a product exists with name "Nut" price "1.50"
    Given I am on the Orders page
    And an order exists for "Eve" "Echo" with product "Nut" quantity "2"
    When I open the most recent order for "Eve Echo"
    And I set the first line quantity to "5" on the detail page
    And I save the order
    Then the order detail total should be "7.50"

  Scenario: Cancel an order from the detail page
    Given I am on the Customers page
    And a customer exists with first name "Frank" last name "Foxtrot" email "frank@example.com"
    Given I am on the Products page
    And a product exists with name "Washer" price "0.75"
    Given I am on the Orders page
    And an order exists for "Frank" "Foxtrot" with product "Washer" quantity "4"
    When I open the most recent order for "Frank Foxtrot"
    And I cancel the order from the detail page
    Then I should not see an order for "Frank Foxtrot"
