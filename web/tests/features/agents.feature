Feature: Agents and Sessions

  Background:
    Given a unique test run id

  Scenario: Add a new agent
    Given I am on the Agents page
    When I add an agent named "Researcher" with description "Looks things up"
    Then I should see an agent row for "Researcher" with description "Looks things up"

  Scenario: Start a new session and chat with the agent
    Given an agent exists named "Helper" with description "A helpful agent"
    And I am on the Sessions page
    When I start a session titled "First chat" with agent "Helper"
    Then I should be on the session detail page for "First chat"
    And the session status should be "running"
    When I send the chat message "Hello agent"
    Then I should see a user chat bubble with "Hello agent"
    And I should see an assistant chat bubble containing "echo: Hello agent"

  Scenario: Session appears in the sessions list after creation
    Given an agent exists named "Lister" with description ""
    And I am on the Sessions page
    When I start a session titled "Listed session" with agent "Lister"
    And I go back from the session detail page
    Then I should see a session row titled "Listed session" with agent "Lister"
