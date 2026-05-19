#!/usr/bin/env bash
# check.sh — Quality gate generated for agent consumption.
#
# Runs all tools regardless of individual failures. On success the tool
# block is suppressed; only failures emit their delimited output. The
# summary always shows all results and the exit code is 0 only when every
# tool passes.
#
# Customize the example tool runs below for the target repo.

PATH="$(cd "$(dirname "$0")/.." && pwd)/node_modules/.bin:$PATH"

run_tool() {
  local name=$1
  shift
  local output exit_code
  output=$("$@" 2>&1)
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "---CHECK:${name}---"
    echo "$output"
    echo ""
  fi
  return $exit_code
}

status() { [ $1 -eq 0 ] && echo PASS || echo FAIL; }

# --- Tools from the repo check, preserved verbatim or adapted ---
run_tool lint:strict npm run lint:strict
LINT_STRICT_EXIT=$?
run_tool validate-docs ./scripts/validate-docs.sh
VALIDATE_DOCS_EXIT=$?

# --- Default tools with agent-friendly output ---
run_tool eslint eslint . --format json
ESLINT_EXIT=$?
run_tool tsc tsc --noEmit
TSC_EXIT=$?
run_tool fallow fallow --production-health --format json --quiet
FALLOW_EXIT=$?
run_tool openspec openspec validate --all --json
OPENSPEC_EXIT=$?

echo "---CHECK:SUMMARY---"
echo "lint:strict: $(status $LINT_STRICT_EXIT)"
echo "validate-docs: $(status $VALIDATE_DOCS_EXIT)"
echo "eslint: $(status $ESLINT_EXIT)"
echo "tsc: $(status $TSC_EXIT)"
echo "fallow: $(status $FALLOW_EXIT)"
echo "openspec: $(status $OPENSPEC_EXIT)"
echo "---CHECK:DONE---"

exit $((LINT_STRICT_EXIT || VALIDATE_DOCS_EXIT || ESLINT_EXIT || TSC_EXIT || FALLOW_EXIT || OPENSPEC_EXIT))
