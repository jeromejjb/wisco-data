/** Strip tables and long dumps — answers live on the map, not in chat. */
export function formatAssistantChatText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withoutTables = trimmed
    .replace(/\|[^\n]+\|\s*\n\s*\|[-:\s|]+\|\s*\n(?:\s*\|[^\n]+\|\s*\n?)+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const looksLikeTable =
    /^\|.+\|/m.test(trimmed) ||
    /\|\s*County\s*\|/i.test(trimmed) ||
    /\|\s*---/.test(trimmed);

  if (looksLikeTable && withoutTables.length < 40) {
    return "Painted on the map — explore counties and hover for details.";
  }

  const text = withoutTables || trimmed;
  if (text.length > 220) {
    return `${text.slice(0, 217).trim()}…`;
  }
  return text;
}

export function getMessageText(message: { parts?: { type: string; text?: string }[] }): string {
  if (!message.parts?.length) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : "") ?? "")
    .join("");
}
