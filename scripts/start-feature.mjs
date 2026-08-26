#!/usr/bin/env node
/**
 * GitHub Flow helper: one feature issue → branch off main → PR into main.
 *
 *   node scripts/start-feature.mjs --issue 12
 *   node scripts/start-feature.mjs --title "Add X" --body "Why" --labels feature,ux
 *   node scripts/start-feature.mjs --issue 12 --dry-run
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { branchName, prBody, shouldStartFeature } from "./feature-branch-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : "";
}

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

function parseLabels(raw) {
  return String(raw || "feature")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function configureGitIdentity() {
  try {
    git(["config", "user.email"]);
    git(["config", "user.name"]);
  } catch {
    git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
    git(["config", "user.name", "github-actions[bot]"]);
  }
}

function loadIssue(number) {
  const json = gh([
    "issue",
    "view",
    String(number),
    "--json",
    "number,title,body,labels,state",
  ]);
  return JSON.parse(json);
}

function createIssue({ title, body, labels }) {
  const args = ["issue", "create", "--title", title, "--body", body || " "];
  for (const label of labels) {
    args.push("--label", label);
  }
  const url = gh(args);
  const match = url.match(/\/issues\/(\d+)/);
  if (!match) throw new Error(`Could not parse issue number from: ${url}`);
  return { number: Number(match[1]), url };
}

function headFilter(branch) {
  const repo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO || "";
  const owner = repo.split("/")[0];
  return owner ? `${owner}:${branch}` : branch;
}

function existingPr(head) {
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
      "number,url,headRefName",
    ]);
    const prs = JSON.parse(raw);
    return prs[0] ?? null;
  } catch {
    return null;
  }
}

function remoteBranchExists(name) {
  try {
    git(["ls-remote", "--exit-code", "--heads", "origin", name]);
    return true;
  } catch {
    return false;
  }
}

function startFromIssue(issue) {
  const gate = shouldStartFeature(issue);
  if (!gate.ok) {
    console.log(`Skip #${issue.number}: ${gate.reason}`);
    return { skipped: true, reason: gate.reason };
  }

  const head = branchName(issue.number, issue.title);
  const already = existingPr(head);
  if (already) {
    console.log(`PR already open: ${already.url}`);
    return { skipped: true, reason: "pr exists", pr: already };
  }

  if (dryRun) {
    console.log(`DRY RUN: would open branch ${head} and PR into main for #${issue.number}`);
    return { dryRun: true, head };
  }

  configureGitIdentity();
  git(["fetch", "origin", "main"]);

  if (remoteBranchExists(head)) {
    console.log(`Branch ${head} already exists on origin — opening PR into main.`);
  } else {
    git(["checkout", "-B", head, "origin/main"]);
    git(["commit", "--allow-empty", "-m", `Start #${issue.number}: ${issue.title}`]);
    git(["push", "-u", "origin", head]);
  }

  const prUrl = gh([
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    head,
    "--title",
    issue.title,
    "--body",
    prBody(issue.number, issue.body),
  ]);
  const prMatch = prUrl.match(/\/pull\/(\d+)/);
  const pr = { url: prUrl, number: prMatch ? Number(prMatch[1]) : undefined };

  gh([
    "issue",
    "comment",
    String(issue.number),
    "--body",
    `Started on \`${head}\` with ${pr.url} (into \`main\`).`,
  ]);

  console.log(`Opened ${pr.url} from ${head} → main`);
  return { pr, head };
}

function main() {
  const issueArg = argValue("--issue");
  const title = argValue("--title");

  if (!issueArg && !title) {
    console.error(
      "Usage:\n  node scripts/start-feature.mjs --issue 12\n  node scripts/start-feature.mjs --title \"Add X\" --body \"Why\" --labels feature,ux"
    );
    process.exit(1);
  }

  try {
    sh("gh", ["auth", "status"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    console.error("GitHub CLI is not authenticated. Run `gh auth login`.");
    process.exit(1);
  }

  let issue;
  if (issueArg) {
    issue = loadIssue(issueArg);
  } else {
    if (dryRun) {
      console.log(`DRY RUN: would create issue "${title}" then open a branch and PR into main`);
      return;
    }
    const created = createIssue({
      title,
      body: argValue("--body"),
      labels: parseLabels(argValue("--labels")),
    });
    console.log(`Opened issue #${created.number} ${created.url ?? ""}`.trim());
    issue = loadIssue(created.number);
  }

  startFromIssue(issue);
}

main();
