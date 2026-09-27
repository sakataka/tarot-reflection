import { describe, expect, test } from "bun:test";
import { findSameNightReading, normalizeQuestion, readingFromRecord, type ReadingRecord } from "./history";

const record = (question: string, createdAt: Date): ReadingRecord => ({
  id: question,
  question,
  spreadId: "one-card",
  cards: [{ cardId: "major_00_fool", orientation: "upright" }],
  jumper: null,
  root: { cardId: "cups_02", orientation: "reversed" },
  narration: "…",
  createdAt: createdAt.toISOString(),
});

describe("same question rule", () => {
  test("ignores spacing, punctuation and width when comparing questions", () => {
    expect(normalizeQuestion("転職、どうしよう？ ")).toBe(normalizeQuestion("転職どうしよう?"));
  });

  test("finds the same question asked earlier the same night only", () => {
    const now = new Date(2026, 8, 28, 1, 0);
    const records = [record("恋のゆくえ", new Date(2026, 8, 27, 22, 0)), record("仕事", new Date(2026, 8, 26, 22, 0))];
    expect(findSameNightReading(records, "恋のゆくえ。", now)?.id).toBe("恋のゆくえ");
    expect(findSameNightReading(records, "仕事", now)).toBeUndefined();
    expect(findSameNightReading(records, "", now)).toBeUndefined();
  });
});

describe("readingFromRecord", () => {
  test("rebuilds cards with positions from ids", () => {
    const reading = readingFromRecord(record("問い", new Date()));
    expect(reading?.cards[0].card.nameJa).toBe("愚者");
    expect(reading?.root?.position.id).toBe("root");
    expect(readingFromRecord({ ...record("x", new Date()), spreadId: "none" })).toBeNull();
  });
});
