import { jumperPosition, rootPosition, spreads } from "../src/data/spreads";
import { tarotDeck } from "../src/data/tarotDeck";
import type { Exchange, Orientation, Reading, ReadingCard, SpreadPosition } from "../src/types/tarot";
import { maxFollowUps, type ReadingRecord } from "../src/utils/history";
import { generateFollowUpPrompt, generatePrompt } from "../src/utils/prompt";

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
  clarification?: unknown;
  createdAt?: unknown;
};

export const maxQuestionLength = 500;
// 占い師と相談者のやりとり一つぶんの上限。
const maxExchangeLength = 1_000;
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

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export const parseExchange = (value: unknown): Exchange | null => {
  const body = (value && typeof value === "object" ? value : {}) as { question?: unknown; answer?: unknown };
  const exchange = { question: text(body.question, maxExchangeLength), answer: text(body.answer, maxExchangeLength) };
  return exchange.question && exchange.answer ? exchange : null;
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

  const question = text(body.question, maxQuestionLength);
  return { question, spread, cards, jumper, root, clarification: parseExchange(body.clarification), createdAt };
}

export function buildPromptFromInterpretationInput(input: unknown, pastReadings: readonly ReadingRecord[] = []): string {
  return generatePrompt(parseReadingInput(input), pastReadings);
}

export type FollowUpRequest = {
  prompt: string;
  recordId: string;
  ask: string;
};

export function buildFollowUpRequest(input: unknown): FollowUpRequest {
  const body = (input && typeof input === "object" ? input : {}) as {
    narration?: unknown;
    previous?: unknown;
    ask?: unknown;
    recordId?: unknown;
  };
  const reading = parseReadingInput(input);
  const ask = text(body.ask, maxQuestionLength);
  if (!ask) throw new Error("Question is empty.");
  const previous = Array.isArray(body.previous) ? body.previous.map(parseExchange).filter((item) => item !== null) : [];
  if (previous.length >= maxFollowUps) throw new Error("No more questions tonight.");
  const narration = typeof body.narration === "string" ? body.narration.slice(0, 20_000) : "";
  return {
    prompt: generateFollowUpPrompt({ reading, narration, previous, ask, isLast: previous.length === maxFollowUps - 1 }),
    recordId: typeof body.recordId === "string" ? body.recordId : "",
    ask,
  };
}
