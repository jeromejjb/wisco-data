import { describe, expect, it } from "vitest";
import { escapeHtml, safeHref } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;"
    );
  });
});

describe("safeHref", () => {
  it("keeps http(s) URLs", () => {
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("http://example.com")).toBe("http://example.com/");
  });

  it("rejects javascript and malformed URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("not a url")).toBeNull();
    expect(safeHref(undefined)).toBeNull();
  });
});
