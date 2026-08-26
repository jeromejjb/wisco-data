/**
 * Night-shift: pick the next catalog improvement that is not already an issue.
 */
export function nightShiftMarker(slug) {
  return `<!-- night-shift:${slug} -->`;
}

export function findingAlreadyFiled(finding, issueTexts) {
  const haystack = (Array.isArray(issueTexts) ? issueTexts : [issueTexts])
    .join("\n")
    .toLowerCase();
  if (!finding) return true;
  if (haystack.includes(nightShiftMarker(finding.slug).toLowerCase())) return true;
  return haystack.includes(String(finding.title).toLowerCase());
}

export const NIGHT_SHIFT_AGENT_MARKER = "<!-- night-shift-agent:";

export function alreadyLaunchedImplement(text) {
  return String(text ?? "").includes(NIGHT_SHIFT_AGENT_MARKER);
}

const SEVERITY_RANK = { blocker: 0, critical: 0, high: 1, medium: 2, low: 3 };

export function nextNightShiftFinding(catalog, issueTexts) {
  const items = Array.isArray(catalog) ? [...catalog] : [];
  items.sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );
  return items.find((item) => !findingAlreadyFiled(item, issueTexts)) ?? null;
}

export function implementPrompt({ number, title, body, repo }) {
  return [
    `You are the Wisconsin Workways night-shift agent on ${repo}.`,
    `Implement GitHub issue #${number}: ${title}`,
    "",
    body,
    "",
    "Rules:",
    "- Work on a new branch from main named issue/{n}-… following this repo's GitHub Flow.",
    "- Open or update ONE pull request into main. Do not merge. Do not force-push.",
    "- Keep the change scoped to this issue. Run npm test (and lint if you touch JS/TS).",
    "- Never commit secrets. Never skip hooks.",
    "- If the issue is already done on main, comment that on the issue and stop.",
  ].join("\n");
}
