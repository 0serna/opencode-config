## ADDED Requirements

### Requirement: Log Exa statuses for diagnostic insights

The system SHALL inspect the Exa Contents API `statuses` response field to capture specific error tags when content retrieval fails, improving diagnostic visibility beyond generic failure messages.

#### Scenario: Log crawl not found

- **WHEN** the Exa Contents API returns a `CRAWL_NOT_FOUND` status for a URL
- **THEN** the system SHALL log the specific tag and associated HTTP status code

#### Scenario: Log crawl timeout

- **WHEN** the Exa Contents API returns a `CRAWL_TIMEOUT` or `CRAWL_LIVECRAWL_TIMEOUT` status for a URL
- **THEN** the system SHALL log the specific timeout tag

#### Scenario: Log source not available

- **WHEN** the Exa Contents API returns a `SOURCE_NOT_AVAILABLE` status for a URL
- **THEN** the system SHALL log the tag and HTTP 403 status code

#### Scenario: Log unknown error

- **WHEN** the Exa Contents API returns a `CRAWL_UNKNOWN_ERROR` status for a URL
- **THEN** the system SHALL log the tag and associated HTTP status code

#### Scenario: Successful fetch with statuses check

- **WHEN** the Exa Contents API returns successfully for a URL
- **THEN** the system SHALL verify the `statuses` field reflects a success state and log the content length
