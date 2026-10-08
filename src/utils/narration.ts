// 占い師の語りは、カードをめくる合図 [[card:N]]、締めの合図 [[close]]、
// 「今夜の答え」を一言にまとめる合図 [[message]] で区切られて届く。
// 届いた途中の文字列からも、表示してよい部分だけを段ごとに切り出す。

export type NarrationSegment =
  | { kind: "intro"; text: string }
  | { kind: "card"; cardIndex: number; text: string }
  | { kind: "close"; text: string }
  | { kind: "message"; text: string };

// 語りの中で、相談者の操作を待つ区切り（カードをめくる・卓を見渡す・答えを告げる）。
export const isGatedSegment = (segment: NarrationSegment) => segment.kind !== "intro";

const markerPattern = /\[\[\s*(card\s*:\s*(\d+)|close|message)\s*\]\]/gi;

export const parseNarration = (raw: string, isComplete: boolean, cardCount: number): NarrationSegment[] => {
  // 書きかけの合図（"[[car" など）は、続きが届くまで表示しない。
  let source = raw;
  if (!isComplete) {
    const openAt = source.lastIndexOf("[[");
    if (openAt >= 0 && !source.slice(openAt).includes("]]")) {
      source = source.slice(0, openAt);
    }
  }

  const segments: NarrationSegment[] = [{ kind: "intro", text: "" }];
  const seenCards = new Set<number>();
  let lastIndex = 0;

  for (const match of source.matchAll(markerPattern)) {
    segments[segments.length - 1].text += source.slice(lastIndex, match.index);
    lastIndex = (match.index ?? 0) + match[0].length;

    if (match[2] !== undefined) {
      const cardIndex = Number(match[2]) - 1;
      if (cardIndex >= 0 && cardIndex < cardCount && !seenCards.has(cardIndex)) {
        seenCards.add(cardIndex);
        segments.push({ kind: "card", cardIndex, text: "" });
      }
    } else {
      const kind = match[1].toLowerCase() === "message" ? "message" : "close";
      if (!segments.some((segment) => segment.kind === kind || segment.kind === "message")) {
        segments.push({ kind, text: "" });
      }
    }
  }
  segments[segments.length - 1].text += source.slice(lastIndex);

  return segments
    .map((segment) => ({ ...segment, text: cleanNarrationText(segment.text) }))
    .filter((segment) => segment.kind !== "intro" || segment.text);
};

// 語りに紛れた Markdown の記号を落とし、段落の区切りだけを残す。
export const cleanNarrationText = (text: string) =>
  text
    .replaceAll("\r\n", "\n")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+/, "");

export const splitParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const segmentStarts = (segments: NarrationSegment[]) => {
  let offset = 0;
  return segments.map((segment) => {
    const start = offset;
    offset += segment.text.length;
    return start;
  });
};

export const narrationToPlainText = (segments: NarrationSegment[], cardLabel: (cardIndex: number) => string, answerTitle = "今夜の答え") =>
  segments
    .map((segment) => {
      if (segment.kind === "card") return `― ${cardLabel(segment.cardIndex)} ―\n\n${segment.text.trim()}`;
      if (segment.kind === "close") return `―\n\n${segment.text.trim()}`;
      if (segment.kind === "message") return `― ${answerTitle} ―\n\n${segment.text.trim()}`;
      return segment.text.trim();
    })
    .join("\n\n");
