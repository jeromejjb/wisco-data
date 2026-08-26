#!/usr/bin/env node
/**
 * File at most one improvement issue from the audit catalog.
 *
 *   node scripts/night-shift-scan.mjs
 *   node scripts/night-shift-scan.mjs --dry-run
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nightShiftMarker, nextNightShiftFinding } from "./night-shift-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

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

function main() {
  const catalog = JSON.parse(
    readFileSync(join(root, ".github/audit-catalog.json"), "utf8")
  );
  const issuesJson = gh([
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "title,body,labels",
  ]);
  const issues = JSON.parse(issuesJson);
  const texts = issues.map((i) => `${i.title}\n${i.body ?? ""}`);
  const finding = nextNightShiftFinding(catalog, texts);

  if (!finding) {
    console.log("No unfiled catalog improvements remain.");
    return;
  }

  const body = [
    nightShiftMarker(finding.slug),
    "",
    finding.problem || finding.body || "_See the audit catalog._",
    "",
    finding.file ? `File: \`${finding.file}\`` : "",
    "",
    "Filed by the night-shift scan. A follow-up job opens a PR for approval when `CURSOR_API_KEY` is set.",
  ]
    .filter(Boolean)
    .join("\n");

  if (dryRun) {
    console.log(`DRY RUN: would file "${finding.title}" (${finding.severity})`);
    return;
  }

  ensureLabel("night-shift", "1e6b9c", "Opened by the 24/7 improvement agent");
  ensureLabel("enhancement", "a2eeef", "New feature or improvement");

  const url = gh([
    "issue",
    "create",
    "--title",
    finding.title,
    "--body",
    body,
    "--label",
    "enhancement",
    "--label",
    "night-shift",
  ]);
  console.log(`Filed ${url}`);
}

main();
