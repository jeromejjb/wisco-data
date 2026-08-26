import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/app-version";

describe("app version", () => {
  it("matches package.json semver", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
  });

  it("is documented in CHANGELOG.md", () => {
    const changelog = readFileSync("CHANGELOG.md", "utf8");
    expect(changelog).toContain(`## [${pkg.version}]`);
  });
});
