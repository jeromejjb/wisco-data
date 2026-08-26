#!/usr/bin/env node
/**
 * Guardrail for releases: package.json version must be semver and appear in CHANGELOG.md.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`package.json version "${version}" is not X.Y.Z semver.`);
  process.exit(1);
}

if (!changelog.includes(`## [${version}]`)) {
  console.error(`CHANGELOG.md is missing a "## [${version}]" heading.`);
  process.exit(1);
}

console.log(`Version ${version} is documented in CHANGELOG.md.`);
