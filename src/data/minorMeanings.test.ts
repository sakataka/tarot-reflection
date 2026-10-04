import { expect, test } from "bun:test";
import { tarotDeck } from "./tarotDeck";

test("all 56 minor cards have distinct upright and reversed meanings", () => {
  const minors = tarotDeck.filter((card) => card.arcana === "minor");
  expect(minors).toHaveLength(56);
  expect(new Set(minors.map((card) => card.upright.shortMeaning)).size).toBe(56);
  expect(new Set(minors.map((card) => card.reversed.shortMeaning)).size).toBe(56);
  for (const card of minors) {
    expect(card.upright.keywords.length).toBeGreaterThanOrEqual(3);
    expect(card.reversed.keywords.length).toBeGreaterThanOrEqual(3);
  }
});

test("same-number RWS cards retain their different themes and courts differ by suit", () => {
  const card = (id: string) => tarotDeck.find((card) => card.id === id)!;
  expect(card("cups_03").upright.keywords).toContain("祝福");
  expect(card("swords_03").upright.keywords).toContain("心の痛み");
  expect(card("swords_09").upright.keywords).toContain("不安");
  expect(card("swords_09").upright.keywords).not.toContain("充足");
  expect(card("wands_10").upright.keywords).toContain("重荷");
  expect(card("pentacles_10").upright.keywords).toContain("長期の安定");
  expect(card("wands_12").upright.shortMeaning).toContain("勢い");
  expect(card("pentacles_12").upright.shortMeaning).toContain("粘り強く");
});
