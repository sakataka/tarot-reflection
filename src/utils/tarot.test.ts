import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tarotDeck } from "../data/tarotDeck";
import { spreads } from "../data/spreads";
import type { SelectedCard } from "../types/tarot";
import type { RandomSource } from "./random";
import { buildReadingCards, createReading, cutDeck, findRootCard, settleShuffle, shuffleDeckForReading, tableCards, validateDeck } from "./tarot";

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

  test("has a production image for every major arcana card", () => {
    const majorCards = tarotDeck.filter((card) => card.arcana === "major");
    const missingImages = majorCards
      .map((card) => card.imagePath)
      .filter((imagePath) => !existsSync(resolve(import.meta.dir, "../../public", imagePath.replace(/^\//, ""))));

    expect(missingImages).toEqual([]);
  });

  test("has a production image for every minor arcana card, shared per suit or its own", () => {
    const minorCards = tarotDeck.filter((card) => card.arcana === "minor");
    const missingImages = [...new Set(minorCards.map((card) => card.imagePath))].filter(
      (imagePath) => !existsSync(resolve(import.meta.dir, "../../public", imagePath.replace(/^\//, ""))),
    );

    expect(missingImages).toEqual([]);
    for (const card of minorCards) {
      expect(card.imagePath).toBe(card.sharedArt ? `cards/minor_${card.suit}.webp` : `cards/${card.id}.webp`);
    }
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

describe("table extras", () => {
  test("sometimes drops a jumper out of the deck", () => {
    const settled = settleShuffle(tarotDeck, deterministicRandom([0.1]));
    expect(settled.jumper).not.toBeNull();
    expect(settled.cards).toHaveLength(77);
    expect(settled.cards.some((drawnCard) => drawnCard.card.id === settled.jumper?.card.id)).toBe(false);
    expect(settleShuffle(tarotDeck, deterministicRandom([0.9])).jumper).toBeNull();
  });

  test("takes the bottom card of the deck, skipping drawn cards, and flips it last", () => {
    const deck = shuffleDeckForReading(tarotDeck.slice(0, 5), deterministicRandom([0.3, 0.6]));
    const selected: SelectedCard[] = [{ ...deck[4], selectedOrder: 1 }];
    expect(findRootCard(deck, selected)?.card.id).toBe(deck[3].card.id);

    const reading = createReading("問い", spreads[0], selected, { deck, createdAt: "2026-09-27T12:00:00.000Z" });
    expect(tableCards(reading).map((readingCard) => readingCard.position.id)).toEqual(["theme", "root"]);
  });
});

describe("cutDeck", () => {
  test("puts the chosen pile on top and keeps the rest in order", () => {
    const cards = [1, 2, 3, 4, 5, 6, 7];
    expect(cutDeck(cards, 1)).toEqual([4, 5, 6, 1, 2, 3, 7]);
    expect(cutDeck(cards, 2)).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(cutDeck(tarotDeck, 0)).toEqual([...tarotDeck]);
    expect(new Set(cutDeck(tarotDeck, 2)).size).toBe(78);
  });
});
