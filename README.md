# github-app-test
## GitHub CLI quick commands #

1. Switch active GitHub account:
2. `gh auth switch`
3. Show logged in accounts and active account:
4. `gh auth status`
5. Login to GitHub.com or GitHub Enterprise:
6. `gh auth login`

This repository contains GitHub Actions workflows for automatic PR creation, PR review/comment automation, build and release automation, Docker image publishing, and CodeQL security scanning.


[![Upload Artifact](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/upload-artifact.yml/badge.svg)](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/upload-artifact.yml)
[![Create Package](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/create-package.yml/badge.svg)](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/create-package.yml)
[![Release Build Artifact](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/release-build-artifact.yml/badge.svg)](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/release-build-artifact.yml)
[![Upload Build To Docker](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/upload-build-to-docker.yml/badge.svg)](https://github.com/pramodsawantgithub/github-app-test/actions/workflows/upload-build-to-docker.yml)

## Workflow summary

### 1. Auto Open PR From Develop

File: `.github/workflows/auto-open-pr.yml`

Purpose:

1. Open or reuse a pull request from `develop` to `main`.

Triggers:

1. `push` on branch `develop`
2. `workflow_dispatch` for manual execution from the Actions tab

Behavior:

1. Checks out the repository.
2. Creates a GitHub App token using `AUTO_PR_APP_ID` and `AUTO_PR_APP_PRIVATE_KEY`.
3. Runs `scripts/create-pr.js`.
4. If a PR from `develop` to `main` is already open, it reuses it and does not create a duplicate.
5. If there are no commits between `develop` and `main`, no PR is created.

Required configuration:

1. Repository secret `AUTO_PR_APP_ID`
2. Repository secret `AUTO_PR_APP_PRIVATE_KEY`
3. GitHub App installed on the repository with pull request write access

### 2. OpenAI PR Assistant

File: `.github/workflows/openai-pr-review.yml`

Purpose:

1. Reply to new PR conversation comments.
2. Add an AI review when a PR is opened or updated.

Triggers:

1. `issue_comment` with type `created`
2. `pull_request` with types `opened`, `reopened`, `synchronize`, `ready_for_review`

Job conditions:

1. `reply-on-pr-comment` runs only when the comment belongs to a PR and the actor is not `github-actions[bot]`.
2. `ai-pr-review` runs only when the event is `pull_request`, the PR is not draft, and the actor is not `github-actions[bot]`.

Behavior:

1. In normal mode, it calls the OpenAI API and posts a reply or PR review.
2. In test mode, it skips OpenAI API calls and posts mock responses instead.
3. If OpenAI returns `insufficient_quota`, the workflow logs a warning and skips the AI action without failing the whole run.

Required configuration:

1. Repository secret `OPENAI_API_KEY` for real AI calls
2. Optional repository variable `OPENAI_MODEL` (default `gpt-4.1-mini`)
3. Optional repository variable `AI_TEST_MODE`

Test mode:

1. Set `AI_TEST_MODE=true` to test the workflow for free.
2. In this mode, the workflow posts mock PR comments and mock PR reviews.

Important scope note:

1. The comment reply job handles new comments in the main PR conversation.
2. It does not currently handle edited comments, deleted comments, or inline review comments on diff lines.

### 3. Post PR Build Completion Message

File: `.github/workflows/post-pr-build-complete.yml`

Purpose:

1. Run after the auto-PR workflow completes and print basic completion details.

Trigger:

1. `workflow_run` for workflow `Auto Open PR From Develop`
2. Type `completed`

Behavior:

1. Runs after the upstream workflow completes with any conclusion.
2. Prints workflow name, conclusion, and upstream run ID.
3. It does not filter only success or failure; it runs for all completion states.

### 4. Team Notification

File: `.github/workflows/team-notification.yml`

Purpose:

1. Send a manual Slack notification from GitHub Actions.

Trigger:

1. `workflow_dispatch`

Inputs:

1. `title`
2. `message`
3. `mention` optional

Required configuration:

1. Repository secret `SLACK_WEBHOOK_URL`

### 5. Upload Artifact

File: `.github/workflows/upload-artifact.yml`

Purpose:

1. Create a simple build output and upload it as an artifact.

Triggers:

1. `push` on branches `develop` and `main`
2. `pull_request` targeting `develop` and `main`

Behavior:

1. Creates `build/app.js`.
2. Prints grouped logs for `Build` and `Build tree`.
3. Uploads `build/` as artifact `build-artifact`.

### 6. Release Build Artifact

File: `.github/workflows/release-build-artifact.yml`

Purpose:

1. Create or update a GitHub release from the uploaded build artifact.

Trigger:

1. `workflow_run` when `Upload Artifact` completes.

Behavior:

1. Runs only for successful `push` events where the source branch is `main`.
2. Downloads `build-artifact` from the completed upstream run.
3. Packages it as `build-artifact-<run_number>-<short_sha>.zip`.
4. Creates the release if it does not exist.
5. If the release already exists, uploads the asset with `--clobber` and updates title/notes.

### 7. Create Package

File: `.github/workflows/create-package.yml`

Purpose:

1. Build a source package archive and upload it as an artifact.

Triggers:

1. `push` on branches `develop` and `main`
2. `workflow_dispatch` for manual execution

Behavior:

1. Checks out repository content.
2. Runs `docker version` and prints grouped Docker logs.
3. Creates `package/source-package-<run_number>.tar.gz` from `README.md`, `build`, `scripts`, and `.github`.
4. Uploads `package/` as artifact `source-package`.

### 8. Upload Build To Docker

File: `.github/workflows/upload-build-to-docker.yml`

Purpose:

1. Build a Docker image from the uploaded build artifact and push it to Docker Hub.

Trigger:

1. `workflow_run` when `Upload Artifact` completes.

Behavior:

1. Runs only for successful `push` events where the source branch is `main`.
2. Downloads `build-artifact` from the completed upstream run.
3. Creates a Docker build context and Dockerfile from the artifact output.
4. Logs in to Docker Hub and pushes image tags:
5. `latest`
6. `build-<run_number>`
7. `sha-<full_commit_sha>`
8. Uses the `production` environment so required reviewers can approve before push.

Required configuration:

1. Repository secret `DOCKERHUB_USERNAME`
2. Repository secret `DOCKERHUB_TOKEN`
3. Environment `production` with required reviewers if approval is needed

### 9. Build SQL Image

File: `.github/workflows/build-sql-image.yml`

Purpose:

1. Build and push a Postgres-based SQL image to Docker Hub.

Triggers:

1. `push` on branch `main` when `sql/**`, `db/sql/**`, or workflow file changes
2. `workflow_dispatch` for manual execution

Behavior:

1. Checks out repository content.
2. Builds Docker context from `sql/` or `db/sql/`.
3. Creates a Postgres Dockerfile and copies init scripts to `/docker-entrypoint-initdb.d/`.
4. Logs in to Docker Hub and pushes image tags:
5. `latest`
6. `build-<run_number>`
7. `sha-<full_commit_sha>`

Required configuration:

1. Repository secret `DOCKERHUB_USERNAME`
2. Repository secret `DOCKERHUB_TOKEN`

### 10. CodeQL Advanced

File: `.github/workflows/codeql.yml`

Purpose:

1. Run CodeQL security and quality analysis for repository code and workflows.

Triggers:

1. `push` on branch `develop`
2. `pull_request` targeting branch `develop`
3. Weekly schedule

Behavior:

1. Scans `actions` and `javascript-typescript` language sets.
2. Runs with query suites `security-extended` and `security-and-quality`.
3. Uploads findings to GitHub code scanning alerts.

Required configuration:

1. No additional repository secrets are required for standard scanning.

### 11. List PRs With Git Extractor

File: `.github/workflows/list-prs-with-git-extractor.yml`

Purpose:

1. Call the reusable `git-extractor-action` action.
2. Resolve commit and pull request context for the current run.
3. Print resolved PR details plus open and closed PR lists from action outputs.

Triggers:

1. `workflow_dispatch` with optional input `pr_number`
2. `push` on branches `develop` and `main`
3. `pull_request` targeting branches `develop` and `main`

Behavior:

1. Checks out repository content.
2. Calls `pramodsawantgithub/git-extractor-action@main`.
3. Passes `secrets.GITHUB_TOKEN` and an optional `pr-number` input.
4. Reads outputs such as `commit-sha`, `pr-id`, `pr-number`, `pr-title`, and `pr-json` from the action step.
5. Prints resolved PR details safely in shell output.
6. Reads and prints `open-pr-count`, `open-prs-json`, `closed-pr-count`, and `closed-prs-json` from the same action step.

How the cross-repository action call works:

1. This repository starts the workflow run from `.github/workflows/list-prs-with-git-extractor.yml`.
2. The `uses: pramodsawantgithub/git-extractor-action@main` step tells GitHub Actions to fetch the action from the `git-extractor-action` repository at ref `main`.
3. GitHub reads that repository's `action.yml` file to find the runtime and entrypoint.
4. The action runs its bundled JavaScript and uses Octokit to query commit and PR data.
5. The action sets outputs.
6. This repository reads those outputs through `steps.extractor.outputs.*` in later steps.

Required configuration:

1. Repository must have access to `pramodsawantgithub/git-extractor-action@main`.
2. `GITHUB_TOKEN` must have `contents: read` and `pull-requests: read` permissions.

Usage notes:

1. On `pull_request` events, the workflow usually resolves the PR automatically from `github.event.pull_request.number`.
2. On `workflow_dispatch`, pass `pr_number` if you want deterministic PR lookup.
3. On `push`, PR resolution depends on whether the current commit is associated with a pull request.

### 12. DORA Metrics With Git Extractor

File: `.github/workflows/dora-metrics-with-git-extractor.yml`

Purpose:

1. Calculate DORA metrics from repository workflow run history through `git-extractor-action`.
2. Print deployment frequency, change failure rate, lead time, MTTR, and full JSON output.

Trigger:

1. `workflow_dispatch`

Inputs:

1. `lookback_days` default `30`
2. `branch` default `main`
3. `workflow_id` optional deployment workflow filter (for example `release-build-artifact.yml`)

Behavior:

1. Checks out repository content.
2. Calls `pramodsawantgithub/git-extractor-action` pinned to a full commit SHA.
3. Passes `include-dora-metrics=true` and DORA filter inputs.
4. Prints outputs such as `dora-deployment-count`, `dora-deployment-frequency-per-day`, `dora-change-failure-rate`, `dora-lead-time-hours`, `dora-mttr-hours`, and `dora-json`.

Required configuration:

1. `GITHUB_TOKEN` must have `actions: read` and `contents: read` permissions.

## Dependency updates

Dependabot configuration file: `.github/dependabot.yml`

Behavior:

1. Scans GitHub Actions dependencies weekly.
2. Opens pull requests for workflow dependency updates.
3. Keeps pinned action references updated through reviewable PRs.

## Notes for knowledge sharing

1. Auto Open PR From Develop no longer runs on a schedule.
2. Auto Open PR From Develop no longer chains from OpenAI PR Assistant completion.
3. OpenAI PR Assistant ignores `github-actions[bot]` to avoid bot loops.
4. Post PR Build Completion Message is informational only; it does not create or modify PRs.
5. Release Build Artifact runs only for successful pushes on `main`.
6. Upload Build To Docker runs through environment `production`, so approvals can be enforced.
7. List PRs With Git Extractor prints PR JSON safely using environment variables so shell parsing does not break on quotes.
8. DORA Metrics With Git Extractor uses a full action commit SHA to keep runs reproducible.
9. Dependabot can automate workflow dependency update PRs, including action ref bumps.

## GitHub App details

App used:

1. `my-test-app-936`

Where it is used:

1. `.github/workflows/auto-open-pr.yml`
2. Step `Create GitHub App token` uses `actions/create-github-app-token@v1`

Secrets required by Actions:

1. `AUTO_PR_APP_ID`
2. `AUTO_PR_APP_PRIVATE_KEY`

How to create values:

1. In GitHub App settings, copy the numeric App ID and save it as `AUTO_PR_APP_ID`.
2. Generate a private key (`.pem`), copy full content including begin/end lines, and save it as `AUTO_PR_APP_PRIVATE_KEY`.

Required GitHub App permissions:

1. Repository permissions:
2. Pull requests: Read and write
3. Contents: Read-only

Installation scope:

1. Install the app on this repository (or organization repositories including this repo).
2. Confirm the target repository is selected in app installation settings.

Why GitHub App is used:

1. Actions gets a short-lived installation token at runtime.
2. PR creation appears as the app identity (bot), which is expected.

Troubleshooting GitHub App token step:

1. `Resource not accessible by integration`:
2. Check app is installed on this repository and has required permissions.
3. `Could not load private key`:
4. Re-copy the full `.pem` content into `AUTO_PR_APP_PRIVATE_KEY` secret.
5. `Not Found` from create-github-app-token:
6. Verify `AUTO_PR_APP_ID` belongs to the same app as the private key.