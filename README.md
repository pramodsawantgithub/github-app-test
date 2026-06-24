# github-app-test

Automatically opens a pull request from `develop` to `main` whenever a commit is pushed to `develop`.

Setup:

1. Push this repository to GitHub.
2. In the repository settings, add these Actions secrets if you want the workflow to use your GitHub App (`my-test-app-936`):
	- `AUTO_PR_APP_ID`
	- `AUTO_PR_APP_PRIVATE_KEY`
3. Install the app on this repository with pull request write access.
4. Add `SLACK_WEBHOOK_URL` if you want to send manual team notifications to Slack.

If those secrets are not configured, the workflow falls back to the default `GITHUB_TOKEN`.

Manual Slack notification:

Use `.github/workflows/team-notification.yml` from the Actions tab when you want to notify the team on demand.

Provide these inputs when you run it:

1. `title`
2. `message`
3. `mention` (optional, for example `<!channel>`)