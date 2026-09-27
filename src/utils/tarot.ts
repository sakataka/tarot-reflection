import { jumperPosition, rootPosition } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { DrawnCard, Reading, ReadingCard, SelectedCard, Spread, TarotCard } from "../types/tarot";
import { randomFloat, randomInt, randomOrientation, shuffle, type RandomSource } from "./random";

export const shuffleDeckForReading = (
  deck: readonly TarotCard[] = tarotDeck,
  random: RandomSource = randomFloat,
): DrawnCard[] =>
  shuffle(deck, random).map((card) => ({
    card,
    orientation: randomOrientation(random),
  }));

// 混ぜている手からカードが一枚こぼれる確率。毎回起きると儀式が軽くなるので、たまにする。
export const jumperChance = 0.2;

// 手を止めた瞬間の並びを決める。ときどき一枚が表向きにこぼれ、その札は山から外れる。
export const settleShuffle = (
  deck: readonly TarotCard[] = tarotDeck,
  random: RandomSource = randomFloat,
): { cards: DrawnCard[]; jumper: DrawnCard | null } => {
  const cards = shuffleDeckForReading(deck, random);
  if (random() >= jumperChance) return { cards, jumper: null };
  const [jumper] = cards.splice(randomInt(cards.length, random), 1);
  return { cards, jumper };
};

export const cutPileCount = 3;

// 山を三つに分け、選ばれた山を一番上に載せ、残りをその下へ元の順で重ねる。
export const cutDeck = <T,>(cards: readonly T[], pileIndex: number, pileCount = cutPileCount): T[] => {
  const pileSize = Math.ceil(cards.length / pileCount);
  const piles = Array.from({ length: pileCount }, (_, index) => cards.slice(index * pileSize, (index + 1) * pileSize));
  const chosen = piles[pileIndex] ?? [];
  return [...chosen, ...piles.filter((_, index) => index !== pileIndex).flat()];
};

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

// 山の一番下に残ったカード。引かれた札は飛ばす。
export const findRootCard = (deck: readonly DrawnCard[], selectedCards: readonly SelectedCard[]): DrawnCard | null => {
  const selectedIds = new Set(selectedCards.map((selectedCard) => selectedCard.card.id));
  return [...deck].reverse().find((drawnCard) => !selectedIds.has(drawnCard.card.id)) ?? null;
};

export const createReading = (
  question: string,
  spread: Spread,
  selectedCards: readonly SelectedCard[],
  { deck = [], jumper = null, createdAt = new Date().toISOString() }: {
    deck?: readonly DrawnCard[];
    jumper?: DrawnCard | null;
    createdAt?: string;
  } = {},
): Reading => {
  const root = findRootCard(deck, selectedCards);
  return {
    question: question.trim(),
    spread,
    cards: buildReadingCards(spread, selectedCards),
    jumper: jumper ? { ...jumper, position: jumperPosition } : null,
    root: root ? { ...root, position: rootPosition } : null,
    createdAt,
  };
};

// 占い師がめくる順のカード。スプレッドの札のあとに、山の底が続く。
export const tableCards = (reading: Reading): ReadingCard[] =>
  reading.root ? [...reading.cards, reading.root] : reading.cards;

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
