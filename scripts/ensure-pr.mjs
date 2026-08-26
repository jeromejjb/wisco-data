#!/usr/bin/env node
/**
 * Open a PR into main when this branch has commits and no open PR.
 *
 *   node scripts/ensure-pr.mjs
 *   node scripts/ensure-pr.mjs --dry-run
 *
 * Used locally (`npm run pr:ensure`) and by .github/workflows/ensure-pr.yml
 * on every push to issue/** so follow-up work never sits without a PR.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  issueNumberFromBranch,
  prBody,
  prTitleFromSubjects,
} from "./feature-branch-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...opts.env },
  }).trim();
}

function gh(args) {
  return sh("gh", args);
}

function git(args) {
  return sh("git", args);
}

function currentBranch() {
  if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_TYPE !== "tag") {
    return process.env.GITHUB_REF_NAME;
  }
  return git(["branch", "--show-current"]);
}

function headFilter(branch) {
  const repo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO || "";
  const owner = repo.split("/")[0];
  return owner ? `${owner}:${branch}` : branch;
}

function existingOpenPr(head) {
  try {
    const raw = gh([
      "pr",
      "list",
      "--state",
      "open",
      "--head",
      headFilter(head),
      "--base",
      "main",
      "--json",
      "number,url",
    ]);
    const prs = JSON.parse(raw);
    return prs[0] ?? null;
  } catch {
    return null;
  }
}

function issueIsOpen(number) {
  try {
    const raw = gh(["issue", "view", String(number), "--json", "state"]);
    return String(JSON.parse(raw).state).toUpperCase() === "OPEN";
  } catch {
    return false;
  }
}

function main() {
  const branch = currentBranch();
  if (!branch || branch === "main" || branch === "master") {
    console.log("Skip: not on a feature branch.");
    return;
  }

  try {
    sh("gh", ["auth", "status"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    console.error("GitHub CLI is not authenticated. Run `gh auth login`.");
    process.exit(1);
  }

  git(["fetch", "origin", "main"]);
  const ahead = Number(git(["rev-list", "--count", `origin/main..HEAD`]));
  if (!Number.isFinite(ahead) || ahead <= 0) {
    console.log(`Skip: ${branch} has no commits ahead of main.`);
    return;
  }

  const already = existingOpenPr(branch);
  if (already) {
    console.log(`PR already open: ${already.url}`);
    return;
  }

  const subjects = git(["log", "--format=%s", "origin/main..HEAD"]).split("\n");
  const onlySeed = subjects.filter(Boolean).every((s) => /^Start #\d+:/i.test(s));
  if (onlySeed) {
    console.log("Skip: seed commit is opened as a PR by start-feature.mjs.");
    return;
  }
  const title = prTitleFromSubjects(subjects, branch);
  const issue = issueNumberFromBranch(branch);
  const summary = subjects
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join("\n");
  const body = issue
    ? prBody(issue, summary, { issueOpen: issueIsOpen(issue) })
    : [
        summary,
        "",
        "## Test plan",
        "- [ ] `npm test` and `npm run lint`",
        "- [ ] Exercise the changed flow in the browser",
      ].join("\n");

  if (dryRun) {
    console.log(`DRY RUN: would open PR "${title}" from ${branch} → main`);
    return;
  }

  const prArgs = [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    title,
    "--body",
    body,
  ];
  try {
    const prUrl = gh(prArgs);
    console.log(`Opened ${prUrl}`);
  } catch (err) {
    const raced = existingOpenPr(branch);
    if (raced) {
      console.log(`PR already open: ${raced.url}`);
      return;
    }
    throw err;
  }
}

main();
