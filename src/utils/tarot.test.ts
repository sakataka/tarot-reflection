import { describe, expect, test } from "bun:test";
import { tarotDeck } from "../data/tarotDeck";
import { spreads } from "../data/spreads";
import type { SelectedCard } from "../types/tarot";
import type { RandomSource } from "./random";
import { buildReadingCards, shuffleDeckForReading, validateDeck } from "./tarot";

const deterministicRandom =
  (values: number[]): RandomSource => {
    let index = 0;
    return () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    };
  };

describe("tarot deck", () => {
  test("contains a complete 78 card deck without duplicate IDs", () => {
    expect(validateDeck(tarotDeck)).toEqual([]);
  });

  test("contains 22 major cards and 14 cards per suit", () => {
    expect(tarotDeck.filter((card) => card.arcana === "major")).toHaveLength(22);
    expect(tarotDeck.filter((card) => card.suit === "wands")).toHaveLength(14);
    expect(tarotDeck.filter((card) => card.suit === "cups")).toHaveLength(14);
    expect(tarotDeck.filter((card) => card.suit === "swords")).toHaveLength(14);
    expect(tarotDeck.filter((card) => card.suit === "pentacles")).toHaveLength(14);
  });
});

describe("reading helpers", () => {
  test("shuffles the deck without duplicating cards and assigns orientations", () => {
    const shuffledCards = shuffleDeckForReading(tarotDeck, deterministicRandom([0.12, 0.88, 0.42, 0.7]));
    const ids = shuffledCards.map((drawnCard) => drawnCard.card.id);

    expect(shuffledCards).toHaveLength(78);
    expect(new Set(ids).size).toBe(78);
    expect(shuffledCards.every((drawnCard) => ["upright", "reversed"].includes(drawnCard.orientation))).toBe(true);
  });

  test("assigns selected card order to spread positions", () => {
    const spread = spreads.find((item) => item.id === "three-card");
    if (!spread) {
      throw new Error("spread missing");
    }

    const selectedCards: SelectedCard[] = [
      { card: tarotDeck[2], orientation: "upright", selectedOrder: 2 },
      { card: tarotDeck[0], orientation: "reversed", selectedOrder: 1 },
      { card: tarotDeck[4], orientation: "upright", selectedOrder: 3 },
    ];

    const readingCards = buildReadingCards(spread, selectedCards);

    expect(readingCards.map((readingCard) => readingCard.position.id)).toEqual(["past", "present", "future"]);
    expect(readingCards.map((readingCard) => readingCard.card.id)).toEqual([
      tarotDeck[0].id,
      tarotDeck[2].id,
      tarotDeck[4].id,
    ]);
  });

  test("rejects selected card counts that do not match the spread", () => {
    expect(() => buildReadingCards(spreads[2], [{ card: tarotDeck[0], orientation: "upright", selectedOrder: 1 }]))
      .toThrow("Selected card count must be 7.");
  });
});
