# web-tools-logging Specification

## Purpose

TBD - created by archiving change improve-web-tools-logging. Update Purpose after archive.

## MODIFIED Requirements

### Requirement: Structured log format

Each log entry SHALL follow a consistent format to support automated parsing (grep, tail, scripts).

#### Scenario: Timestamp prefix

- **WHEN** any event is logged
- **THEN** the entry SHALL start with an ISO 8601 timestamp followed by a space, then the source, event, and fields

#### Scenario: JSON data

- **WHEN** an event includes additional data (URL, status, count, etc.)
- **THEN** the data SHALL be encoded as a JSON object appended after the event name
