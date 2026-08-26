/**
 * Helpers for GitHub Flow: one issue → one branch → one PR into main.
 */

export function slugify(title, max = 72) {
  const slug = String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "feature";
}

export function branchName(number, title) {
  return `issue/${number}-${slugify(title)}`;
}

/** `issue/12-rate-limit-copy` → 12. Other branch names → null. */
export function issueNumberFromBranch(name) {
  const match = String(name ?? "").match(/^issue\/(\d+)(?:-|$)/);
  return match ? Number(match[1]) : null;
}

function labelNames(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => (typeof label === "string" ? label : label?.name)).filter(Boolean);
}

/**
 * @param {{ pull_request?: unknown, state?: string, labels?: unknown }} issue
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function shouldStartFeature(issue) {
  const labels = labelNames(issue?.labels);
  if (issue?.pull_request) return { ok: false, reason: "issue is a pull request" };
  if (issue?.state && issue.state !== "open") return { ok: false, reason: "issue is not open" };
  if (labels.includes("automated") || labels.includes("no-branch") || labels.includes("night-shift")) {
    return { ok: false, reason: "skipped by label" };
  }
  if (!labels.includes("feature") && !labels.includes("enhancement")) {
    return { ok: false, reason: "needs feature or enhancement label" };
  }
  return { ok: true };
}

export function prBody(issueNumber, issueBody, opts = {}) {
  const summary = String(issueBody ?? "").trim() || "_See the linked issue._";
  const link = opts.issueOpen === false ? `Related to #${issueNumber}` : `Closes #${issueNumber}`;
  return [
    link,
    "",
    summary,
    "",
    "## Test plan",
    "- [ ] `npm test` and `npm run lint`",
    "- [ ] Exercise the changed flow in the browser",
    "",
    "_Branch and PR opened against `main`. CI runs after the first push of work._",
  ].join("\n");
}

/** Title for an auto-opened PR: prefer real work commits over the empty "Start #n" seed. */
export function prTitleFromSubjects(subjects, branch) {
  const lines = (Array.isArray(subjects) ? subjects : String(subjects ?? "").split("\n"))
    .map((s) => s.trim())
    .filter(Boolean);
  const work = lines.find((s) => !/^Start #\d+:/i.test(s));
  if (work) return work;
  if (lines[0]) return lines[0];
  const issue = issueNumberFromBranch(branch);
  if (issue) return `Continue #${issue}`;
  return branch || "Update";
}

/** Parse `gh pr create` when a PR for this head already exists. */
export function prAlreadyExistsUrl(stderr) {
  const match = String(stderr ?? "").match(
    /already exists:\s*(https:\/\/github\.com\/[^\s]+\/pull\/\d+)/i
  );
  return match ? match[1] : null;
}
