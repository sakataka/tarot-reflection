const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const renderMarkdown = (markdown: string) => {
  const output: string[] = [];
  const lines = markdown.trim().replaceAll("\r\n", "\n").split("\n");
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      output.push(`<p>${paragraph.map(inlineMarkdown).join("<br />")}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType) {
      output.push(`<${listType}>${listItems.map((item) => `<li>${item.map(inlineMarkdown).join("<br />")}</li>`).join("")}</${listType}>`);
      listType = null;
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line);
    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);

    if (!line) {
      flushParagraph();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = Number(heading[1].length) + 1;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (unorderedItem || orderedItem) {
      flushParagraph();
      const type = unorderedItem ? "ul" : "ol";
      if (listType !== type) {
        flushList();
        listType = type;
      }
      listItems.push([(unorderedItem ?? orderedItem)?.[1] ?? ""]);
    } else if (listType && /^\s+/.test(rawLine) && listItems.length > 0) {
      listItems[listItems.length - 1].push(line);
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return output.join("");
};

const inlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
