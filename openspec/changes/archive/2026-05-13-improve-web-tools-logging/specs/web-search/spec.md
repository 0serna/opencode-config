## ADDED Requirements

### Requirement: Log search outcomes for diagnostics

The system SHALL log successful and failed Exa Search API calls to the persistent log file, enabling monitoring of search health and usage patterns.

#### Scenario: Log successful search

- **WHEN** the system calls `web_search` and the Exa API returns results successfully
- **THEN** the system SHALL log the event with the query string and the number of results returned

#### Scenario: Log failed search

- **WHEN** the system calls `web_search` and the Exa API returns an error
- **THEN** the system SHALL log the event with the query string and the HTTP status or error description

#### Scenario: Log empty results

- **WHEN** the system calls `web_search` and the Exa API returns zero results
- **THEN** the system SHALL log the event with the query string and a zero result count
