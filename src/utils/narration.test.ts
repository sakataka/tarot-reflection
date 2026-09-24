import { describe, expect, test } from "bun:test";
import { narrationToPlainText, parseNarration, segmentStarts } from "./narration";

describe("parseNarration", () => {
  test("splits intro, cards and closing by markers", () => {
    const segments = parseNarration("問いを受け取りました。\n[[card:1]]\n一枚目です。\n[[card:2]]\n二枚目。\n[[close]]\n締めです。", true, 2);
    expect(segments).toEqual([
      { kind: "intro", text: "問いを受け取りました。\n" },
      { kind: "card", cardIndex: 0, text: "一枚目です。\n" },
      { kind: "card", cardIndex: 1, text: "二枚目。\n" },
      { kind: "close", text: "締めです。" },
    ]);
  });

  test("hides a marker that is still arriving", () => {
    expect(parseNarration("では、返しましょう。\n[[car", false, 3)).toEqual([
      { kind: "intro", text: "では、返しましょう。\n" },
    ]);
    expect(parseNarration("では。[[car", true, 3)[0].text).toBe("では。[[car");
  });

  test("ignores out-of-range and repeated card markers and strips markdown", () => {
    const segments = parseNarration("[[card:1]]\n## 見出し\n**太字**の語り[[card:1]]続き[[card:9]]", true, 1);
    expect(segments).toEqual([{ kind: "card", cardIndex: 0, text: "見出し\n太字の語り続き" }]);
  });

  test("computes segment offsets and plain text", () => {
    const segments = parseNarration("はじめ[[card:1]]一枚目[[close]]おわり", true, 1);
    expect(segmentStarts(segments)).toEqual([0, 3, 6]);
    expect(narrationToPlainText(segments, () => "現在・星")).toBe("はじめ\n\n― 現在・星 ―\n\n一枚目\n\n―\n\nおわり");
  });
});
