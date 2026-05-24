#!/bin/bash

# push-tests-to-repo.sh
# Copies generated feature/step files from playwright-tests/ into the cloned
# test repository, then commits and pushes any changes.

set -e

TEST_REPO_DIR="${TEST_REPO_DIR:-test-repo}"
GIT_COMMIT="${GIT_COMMIT:-unknown}"
GIT_AUTHOR="${GIT_AUTHOR:-Jenkins}"

echo "Syncing generated test files to test repository..."

mkdir -p "${TEST_REPO_DIR}/features"
mkdir -p "${TEST_REPO_DIR}/step-definitions"

cp -r playwright-tests/features/. "${TEST_REPO_DIR}/features/" 2>/dev/null || true
cp -r playwright-tests/step-definitions/. "${TEST_REPO_DIR}/step-definitions/" 2>/dev/null || true

cd "${TEST_REPO_DIR}"

git config user.email "jenkins@automator-ci.local"
git config user.name "Jenkins CI"

git add features/ step-definitions/

if git diff --staged --quiet; then
    echo "No test file changes to push — test repository is already up to date"
    exit 0
fi

SHORT_COMMIT="${GIT_COMMIT:0:7}"
git commit -m "ci: update BDD tests for ${SHORT_COMMIT} (${GIT_AUTHOR})"
git push

echo "✓ Test files pushed to test repository"
