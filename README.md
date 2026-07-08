# github-app-test
Switch git
gh auth switch (it will auto switch to antoher)
gh auth status.  (it will provide list of account and active status )
gh auth login  (to login git pord or per)

This repository contains GitHub Actions workflows for automatic PR creation, PR review/comment automation, and follow-up workflow notifications.


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

## Notes for knowledge sharing

1. Auto Open PR From Develop no longer runs on a schedule.
2. Auto Open PR From Develop no longer chains from OpenAI PR Assistant completion.
3. OpenAI PR Assistant ignores `github-actions[bot]` to avoid bot loops.
4. Post PR Build Completion Message is informational only; it does not create or modify PRs.
5. Release Build Artifact runs only for successful pushes on `main`.
6. Upload Build To Docker runs through environment `production`, so approvals can be enforced.

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