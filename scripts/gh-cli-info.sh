#!/usr/bin/env bash

set -u

run_optional() {
  local title="$1"
  shift

  echo
  echo "== $title =="

  if ! "$@"; then
    echo "Command failed but workflow will continue: $*" >&2
  fi
}

echo "== Environment =="
env

echo
echo "== GH CLI Version =="
gh --version

run_optional "GH CLI Auth Status" gh auth status
run_optional "GH CLI Repo List" gh repo list "$GITHUB_REPOSITORY_OWNER" --limit 20
run_optional "GH CLI Issue List" gh issue list --repo "$GITHUB_REPOSITORY"
run_optional "GH CLI Workflow List" gh workflow list --repo "$GITHUB_REPOSITORY"