#!/usr/bin/env node
/**
 * File improvement issues from the audit catalog.
 *
 *   node scripts/night-shift-scan.mjs
 *   node scripts/night-shift-scan.mjs --dry-run
 *   node scripts/night-shift-scan.mjs --all
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nightShiftMarker, nextNightShiftFinding } from "./night-shift-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const fileAll = process.argv.includes("--all");

function gh(args) {
  return execFileSync("gh", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function ensureLabel(name, color, description) {
  try {
    gh(["label", "create", name, "--color", color, "--description", description, "--force"]);
  } catch {
    /* already exists */
  }
}

function issueBody(finding) {
  return [
    nightShiftMarker(finding.slug),
    "",
    `**Severity:** ${finding.severity}`,
    finding.area ? `**Area:** ${finding.area}` : "",
    "",
    finding.problem || finding.body || "_See the audit catalog._",
    "",
    finding.file ? `File: \`${finding.file}\`` : "",
    "",
    "Filed by the night-shift scan. A follow-up job opens a PR for approval when `CURSOR_API_KEY` is set.",
  ]
    .filter(Boolean)
    .join("\n");
}

function listIssueTexts() {
  const issuesJson = gh([
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    "500",
    "--json",
    "title,body,labels",
  ]);
  return JSON.parse(issuesJson).map((i) => `${i.title}\n${i.body ?? ""}`);
}

function fileFinding(finding) {
  return gh([
    "issue",
    "create",
    "--title",
    finding.title,
    "--body",
    issueBody(finding),
    "--label",
    "enhancement",
    "--label",
    "night-shift",
  ]);
}

function sleep(ms) {
  const seconds = Math.max(0.2, ms / 1000);
  try {
    execFileSync("sleep", [String(seconds)], { stdio: "ignore" });
  } catch {
    /* best-effort pacing against GitHub rate limits */
  }
}

function main() {
  const catalog = JSON.parse(
    readFileSync(join(root, ".github/audit-catalog.json"), "utf8")
  );
  const texts = listIssueTexts();
  const max = fileAll ? Number.POSITIVE_INFINITY : 1;
  let filed = 0;

  if (!dryRun) {
    ensureLabel("night-shift", "1e6b9c", "Opened by the 24/7 improvement agent");
    ensureLabel("enhancement", "a2eeef", "New feature or improvement");
  }

  while (filed < max) {
    const finding = nextNightShiftFinding(catalog, texts);
    if (!finding) {
      if (filed === 0) console.log("No unfiled catalog improvements remain.");
      else console.log(`Filed ${filed} issue${filed === 1 ? "" : "s"}.`);
      return;
    }

    if (dryRun) {
      console.log(`DRY RUN: would file "${finding.title}" (${finding.severity})`);
    } else {
      const url = fileFinding(finding);
      console.log(`Filed ${url}`);
      sleep(200);
    }

    texts.push(`${nightShiftMarker(finding.slug)}\n${finding.title}`);
    filed += 1;
  }
}

main();
