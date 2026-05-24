#!/bin/bash

# list-all-source-files.sh
# Lists all relevant source files for bootstrap/initial test generation.
# Used when INITIAL_SETUP=true to generate tests for the entire codebase.

echo "Listing all source files for bootstrap generation..." >&2

RELEVANT_FILES=$(find backend/ frontend/ -type f \( \
    -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
    \) 2>/dev/null \
    | grep -vE "node_modules|dist|build|\.git" \
    | grep -vE "package-lock\.json|yarn\.lock|pnpm-lock\.yaml" \
    | grep -vE "\.test\.|\.spec\.|__tests__|__mocks__" \
    | sort)

if [ -z "$RELEVANT_FILES" ]; then
    echo "No source files found" >&2
    exit 0
fi

FILE_COUNT=$(echo "$RELEVANT_FILES" | wc -l | tr -d ' ')
echo "Found ${FILE_COUNT} source file(s) for bootstrap generation" >&2

echo "$RELEVANT_FILES"

exit 0
