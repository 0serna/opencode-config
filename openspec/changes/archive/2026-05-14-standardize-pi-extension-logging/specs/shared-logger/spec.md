# shared-logger Specification

## Purpose

The shared logger provides a single `log(source, event, data)` function that all pi extensions use for diagnostic logging, ensuring consistent path, format, truncation, and error handling.

## ADDED Requirements

### Requirement: Log API

The shared logger SHALL expose a function `log(source, event, data)` that writes a single log entry.

#### Scenario: Log call with data

- **WHEN** `log` is called with a source name, event name, and data object
- **THEN** a single line SHALL be appended to the log file for that source

#### Scenario: Log call without data

- **WHEN** `log` is called with only source and event (no data)
- **THEN** a single line SHALL be appended with just the timestamp, source, and event

### Requirement: Log file path

Each source SHALL write to its own log file at `~/.local/state/pi/<source>.log`.

#### Scenario: Path derived from source

- **WHEN** `log('web-tools', ...)` is called
- **THEN** the entry SHALL be written to `~/.local/state/pi/web-tools.log`

#### Scenario: Parent directory auto-created

- **WHEN** the `~/.local/state/pi/` directory does not exist on first write
- **THEN** the directory SHALL be created automatically

### Requirement: Line format

Each log entry SHALL follow a consistent machine-parseable format.

#### Scenario: Timestamp prefix

- **WHEN** any entry is written
- **THEN** it SHALL start with an ISO 8601 timestamp (e.g., `2026-05-14T15:23:01.123Z`)

#### Scenario: Entry without data

- **WHEN** `log` is called without a data argument
- **THEN** the line SHALL be `TIMESTAMP SOURCE EVENT\n` with no trailing content after the event name

#### Scenario: Entry with JSON data

- **WHEN** `log` is called with a data object
- **THEN** the line SHALL be `TIMESTAMP SOURCE EVENT {...json}\n` with a space separating the event name and the JSON object

#### Scenario: Trailing newline

- **WHEN** any entry is written
- **THEN** it SHALL end with a newline character

### Requirement: Log size management

The shared logger SHALL prevent unbounded log file growth by truncating to a fixed maximum number of lines.

#### Scenario: Trim oldest entries

- **WHEN** a log file exceeds 2000 lines after appending
- **THEN** the file SHALL be rewritten keeping only the most recent 2000 lines

### Requirement: Error resilience

The shared logger SHALL never throw or reject — all errors during logging SHALL be silently caught.

#### Scenario: Write error caught

- **WHEN** a filesystem error occurs during append (permissions, disk full, etc.)
- **THEN** the error SHALL be silently caught and the extension SHALL continue without interruption

#### Scenario: Truncation error caught

- **WHEN** a filesystem error occurs during truncation
- **THEN** the error SHALL be silently caught and the existing log file SHALL be left unchanged

#### Scenario: JSON serialization error caught

- **WHEN** the data object cannot be JSON-serialized (e.g., circular reference, BigInt)
- **THEN** the logger SHALL still write the timestamp/source/event line without the data portion, and SHALL not throw

### Requirement: Module-level safety

The shared logger module SHALL have no side effects at import time.

#### Scenario: Import is safe

- **WHEN** the module is imported
- **THEN** no filesystem operations SHALL be performed
- **THEN** no exceptions SHALL be thrown
