import { jumperPosition, rootPosition, spreads } from "../src/data/spreads";
import { tarotDeck } from "../src/data/tarotDeck";
import type { Orientation, Reading, ReadingCard, SpreadPosition } from "../src/types/tarot";
import type { ReadingRecord } from "../src/utils/history";
import { generatePrompt } from "../src/utils/prompt";

type CardInput = {
  cardId?: unknown;
  orientation?: unknown;
};

type ReadingInput = {
  question?: unknown;
  spreadId?: unknown;
  cards?: unknown;
  jumper?: unknown;
  root?: unknown;
  createdAt?: unknown;
};

export const maxQuestionLength = 500;
const orientations = new Set<Orientation>(["upright", "reversed"]);

const parseCard = (item: unknown, position: SpreadPosition): ReadingCard => {
  const cardInput = (item && typeof item === "object" ? item : {}) as CardInput;
  const cardId = typeof cardInput.cardId === "string" ? cardInput.cardId : "";
  const card = tarotDeck.find((candidate) => candidate.id === cardId);
  if (!card) {
    throw new Error("Unknown card.");
  }
  if (!orientations.has(cardInput.orientation as Orientation)) {
    throw new Error("Unknown card orientation.");
  }
  return { position, card, orientation: cardInput.orientation as Orientation };
};

// ブラウザから届いた卓の状態を検証して Reading に組み直す。任意の文面はここで捨てる。
export function parseReadingInput(input: unknown, createdAt = new Date().toISOString()): Reading {
  const body = (input && typeof input === "object" ? input : {}) as ReadingInput;
  const spreadId = typeof body.spreadId === "string" ? body.spreadId : "";
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) {
    throw new Error("Unknown spread.");
  }

  if (!Array.isArray(body.cards) || body.cards.length !== spread.positions.length) {
    throw new Error("Card count does not match spread.");
  }

  const cards = body.cards.map((item, index) => parseCard(item, spread.positions[index]));
  const jumper = body.jumper ? parseCard(body.jumper, jumperPosition) : null;
  const root = body.root ? parseCard(body.root, rootPosition) : null;
  const ids = [...cards, jumper, root].filter((card) => card !== null).map((readingCard) => readingCard.card.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("The same card appears twice.");
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, maxQuestionLength) : "";
  return { question, spread, cards, jumper, root, createdAt };
}

export function buildPromptFromInterpretationInput(input: unknown, pastReadings: readonly ReadingRecord[] = []): string {
  return generatePrompt(parseReadingInput(input), pastReadings);
}
