const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const renderMarkdown = (markdown: string) => {
  const blocks = markdown.trim().split(/\n{2,}/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) {
        return "";
      }

      if (trimmed.startsWith("### ")) {
        return `<h4>${escapeHtml(trimmed.slice(4))}</h4>`;
      }

      if (trimmed.startsWith("## ")) {
        return `<h3>${escapeHtml(trimmed.slice(3))}</h3>`;
      }

      if (trimmed.startsWith("# ")) {
        return `<h2>${escapeHtml(trimmed.slice(2))}</h2>`;
      }

      const lines = trimmed.split("\n");
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      }

      return `<p>${inlineMarkdown(trimmed).replaceAll("\n", "<br />")}</p>`;
    })
    .join("");
};

const inlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
