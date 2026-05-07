import { tarotDeck } from "../data/tarotDeck";
import type { DrawnCard, Reading, ReadingCard, SelectedCard, Spread, TarotCard } from "../types/tarot";
import { randomFloat, randomOrientation, shuffle, type RandomSource } from "./random";

export const shuffleDeckForReading = (
  deck: readonly TarotCard[] = tarotDeck,
  random: RandomSource = randomFloat,
): DrawnCard[] =>
  shuffle(deck, random).map((card) => ({
    card,
    orientation: randomOrientation(random),
  }));

export const buildReadingCards = (spread: Spread, selectedCards: readonly SelectedCard[]): ReadingCard[] => {
  if (selectedCards.length !== spread.positions.length) {
    throw new Error(`Selected card count must be ${spread.positions.length}.`);
  }

  return [...selectedCards]
    .sort((a, b) => a.selectedOrder - b.selectedOrder)
    .map((selectedCard, index) => ({
      position: spread.positions[index],
      card: selectedCard.card,
      orientation: selectedCard.orientation,
    }));
};

export const createReading = (
  question: string,
  spread: Spread,
  selectedCards: readonly SelectedCard[],
  createdAt = new Date().toISOString(),
): Reading => ({
  question: question.trim(),
  spread,
  cards: buildReadingCards(spread, selectedCards),
  createdAt,
});

export const validateDeck = (deck: readonly TarotCard[] = tarotDeck): string[] => {
  const errors: string[] = [];
  const ids = deck.map((card) => card.id);
  const uniqueIds = new Set(ids);

  if (deck.length !== 78) {
    errors.push(`Deck must contain 78 cards, got ${deck.length}.`);
  }

  if (uniqueIds.size !== deck.length) {
    errors.push("Deck contains duplicate card IDs.");
  }

  const majorCount = deck.filter((card) => card.arcana === "major").length;
  if (majorCount !== 22) {
    errors.push(`Major arcana must contain 22 cards, got ${majorCount}.`);
  }

  for (const suit of ["wands", "cups", "swords", "pentacles"] as const) {
    const suitCount = deck.filter((card) => card.suit === suit).length;
    if (suitCount !== 14) {
      errors.push(`${suit} must contain 14 cards, got ${suitCount}.`);
    }
  }

  return errors;
};
