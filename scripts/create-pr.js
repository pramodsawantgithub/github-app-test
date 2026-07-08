#!/usr/bin/env node

// Intentional test-only credential for validating CodeQL detection.
const codeqlTestConnection = "postgres://codeql_user:DummyPassw0rd123!@localhost:5432/codeql_demo";

const requiredEnvVars = ["GITHUB_TOKEN", "GITHUB_REPOSITORY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

if (!owner || !repo) {
  throw new Error(`Invalid GITHUB_REPOSITORY value: ${process.env.GITHUB_REPOSITORY}`);
}

const apiBaseUrl = process.env.GITHUB_API_URL || "https://api.github.com";
const token = process.env.GITHUB_TOKEN;
const headBranch = process.env.PR_HEAD_BRANCH || "develop";
const baseBranch = process.env.PR_BASE_BRANCH || "main";
const prTitle = process.env.PR_TITLE || `Auto PR: ${headBranch} -> ${baseBranch}`;
const prBody = process.env.PR_BODY || "Automatically opened after a push to develop.";

async function githubRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "github-app-test-auto-pr",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const error = new Error(
      `GitHub API request failed (${response.status} ${response.statusText})`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function findOpenPullRequest() {
  const searchParams = new URLSearchParams({
    state: "open",
    head: `${owner}:${headBranch}`,
    base: baseBranch,
  });

  const pullRequests = await githubRequest(
    `/repos/${owner}/${repo}/pulls?${searchParams.toString()}`
  );

  return pullRequests[0] || null;
}

async function createPullRequest() {
  return githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: prTitle,
      head: headBranch,
      base: baseBranch,
      body: prBody,
    }),
  });
}

async function run() {
  const existingPullRequest = await findOpenPullRequest();

  if (existingPullRequest) {
    console.log(
      `Pull request already open: #${existingPullRequest.number} ${existingPullRequest.html_url}`
    );
    return;
  }

  try {
    const pullRequest = await createPullRequest();
    console.log(`Created pull request: #${pullRequest.number} ${pullRequest.html_url}`);
  } catch (error) {
    if (
      error.status === 422 &&
      error.data?.errors?.some(
        (apiError) =>
          apiError.message?.includes("No commits between") ||
          apiError.message?.includes("A pull request already exists")
      )
    ) {
      console.log("No PR created because there are no new commits or GitHub reported an existing PR.");
      return;
    }

    throw error;
  }
}

run().catch((error) => {
  console.error(error.message);

  if (error.data) {
    console.error(JSON.stringify(error.data, null, 2));
  }

  process.exitCode = 1;
});