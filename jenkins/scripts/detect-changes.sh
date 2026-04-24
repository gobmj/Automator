#!/bin/bash

# detect-changes.sh
# Detects modified files between current commit and previous commit
# Filters for relevant source files only

set -e

echo "Detecting file changes..." >&2

# Get the previous commit (parent of HEAD)
PREVIOUS_COMMIT="HEAD~1"
CURRENT_COMMIT="HEAD"

# Check if this is the first commit
if ! git rev-parse "$PREVIOUS_COMMIT" >/dev/null 2>&1; then
    echo "First commit detected. Analyzing all files..." >&2
    PREVIOUS_COMMIT=$(git hash-object -t tree /dev/null)
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only "$PREVIOUS_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
    echo "No files changed" >&2
    exit 0
fi

# Filter for relevant files (source code only)
# Include: .js, .jsx, .ts, .tsx, .json (excluding package-lock.json)
# Exclude: node_modules, dist, build, .git, test files

RELEVANT_FILES=""

while IFS= read -r file; do
    # Skip if file doesn't exist (deleted files)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Skip node_modules, dist, build directories
    if echo "$file" | grep -qE "node_modules|dist|build|\.git"; then
        continue
    fi
    
    # Skip package-lock.json and other lock files
    if echo "$file" | grep -qE "package-lock\.json|yarn\.lock|pnpm-lock\.yaml"; then
        continue
    fi
    
    # Skip test files (we'll generate tests for source files)
    if echo "$file" | grep -qE "\.test\.|\.spec\.|__tests__|__mocks__"; then
        continue
    fi
    
    # Include only source files
    if echo "$file" | grep -qE "\.(js|jsx|ts|tsx|json)$"; then
        # Check if it's in backend or frontend directory
        if echo "$file" | grep -qE "^(backend|frontend)/"; then
            RELEVANT_FILES="${RELEVANT_FILES}${file}"$'\n'
        fi
    fi
done <<< "$CHANGED_FILES"

# Remove trailing newline
RELEVANT_FILES=$(echo "$RELEVANT_FILES" | sed '/^$/d')

if [ -z "$RELEVANT_FILES" ]; then
    echo "No relevant source files changed" >&2
    exit 0
fi

# Output the list of relevant files
echo "$RELEVANT_FILES"

# Log summary to stderr
FILE_COUNT=$(echo "$RELEVANT_FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT relevant file(s) changed" >&2

exit 0