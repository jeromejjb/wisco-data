#!/usr/bin/env node
/**
 * Launch one Cursor cloud agent to implement the oldest open night-shift issue.
 * Requires CURSOR_API_KEY. Does not merge — the PR waits for GitHub approval.
 *
 *   node scripts/night-shift-implement.mjs
 *   node scripts/night-shift-implement.mjs --dry-run
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { alreadyLaunchedImplement, implementPrompt } from "./night-shift-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function gh(args) {
  return execFileSync("gh", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function issueHasOpenPr(number) {
  try {
    const raw = gh([
      "pr",
      "list",
      "--state",
      "open",
      "--search",
      `${number} in:title,body`,
      "--json",
      "number,title,body",
    ]);
    const prs = JSON.parse(raw);
    return prs.some(
      (pr) =>
        new RegExp(`\\b#${number}\\b`).test(`${pr.title}\n${pr.body ?? ""}`) ||
        new RegExp(`issue/${number}(?:-|$)`).test(pr.title)
    );
  } catch {
    return false;
  }
}

function issueLaunchTrail(number) {
  try {
    const comments = gh([
      "api",
      `repos/${process.env.GITHUB_REPOSITORY || process.env.GH_REPO}/issues/${number}/comments`,
      "--jq",
      ".[].body",
    ]);
    return comments;
  } catch {
    return "";
  }
}

async function launchAgent({ name, prompt, repoUrl }) {
  const key = process.env.CURSOR_API_KEY?.trim();
  if (!key) {
    console.log("Skip implement: CURSOR_API_KEY is not set.");
    return null;
  }

  const res = await fetch("https://api.cursor.com/v1/agents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: String(name || "Night shift").slice(0, 100),
      prompt: { text: prompt },
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: true,
      skipReviewerRequest: true,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cursor agent create failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO;
  if (!repo) {
    console.error("GITHUB_REPOSITORY or GH_REPO is required.");
    process.exit(1);
  }

  const raw = gh([
    "issue",
    "list",
    "--state",
    "open",
    "--label",
    "night-shift",
    "--limit",
    "20",
    "--json",
    "number,title,body",
  ]);
  const issues = JSON.parse(raw);
  const issue = issues.find((item) => {
    if (issueHasOpenPr(item.number)) return false;
    const trail = `${item.body ?? ""}\n${issueLaunchTrail(item.number)}`;
    return !alreadyLaunchedImplement(trail);
  });

  if (!issue) {
    console.log("No open night-shift issues waiting for a PR.");
    return;
  }

  const prompt = implementPrompt({
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    repo,
  });

  if (dryRun) {
    console.log(`DRY RUN: would implement #${issue.number} ${issue.title}`);
    return;
  }

  const launched = await launchAgent({
    name: `Night shift #${issue.number}`,
    prompt,
    repoUrl: `https://github.com/${repo}`,
  });
  if (!launched) return;

  const agentId = launched.agent?.id ?? launched.id ?? "unknown";
  const agentUrl = launched.agent?.url ?? `https://cursor.com/agents/${agentId}`;
  gh([
    "issue",
    "comment",
    String(issue.number),
    "--body",
    [
      `<!-- night-shift-agent:${agentId} -->`,
      `Night-shift implement started: [${agentId}](${agentUrl}).`,
      "A pull request will open for review. It will not merge itself.",
    ].join("\n"),
  ]);
  console.log(`Started agent ${agentId} for #${issue.number}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
