/** Escape untrusted strings before interpolating into `setHTML` / innerHTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow only absolute http(s) URLs in popup links. Returns the href or null. */
export function safeHref(url: string | undefined | null): string | null {
  if (!url || !/^https?:\/\//i.test(url.trim())) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}
