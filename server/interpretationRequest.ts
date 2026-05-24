import { spreads } from "../src/data/spreads";
import { tarotDeck } from "../src/data/tarotDeck";
import type { Orientation, Reading } from "../src/types/tarot";
import { generatePrompt } from "../src/utils/prompt";

type InterpretationCardInput = {
  cardId?: unknown;
  orientation?: unknown;
};

type InterpretationInput = {
  question?: unknown;
  spreadId?: unknown;
  cards?: unknown;
};

const maxQuestionLength = 500;
const orientations = new Set<Orientation>(["upright", "reversed"]);

export function buildPromptFromInterpretationInput(input: unknown): string {
  const body = (input && typeof input === "object" ? input : {}) as InterpretationInput;
  const spreadId = typeof body.spreadId === "string" ? body.spreadId : "";
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) {
    throw new Error("Unknown spread.");
  }

  if (!Array.isArray(body.cards) || body.cards.length !== spread.positions.length) {
    throw new Error("Card count does not match spread.");
  }

  const cards = body.cards.map((item, index) => {
    const cardInput = (item && typeof item === "object" ? item : {}) as InterpretationCardInput;
    const cardId = typeof cardInput.cardId === "string" ? cardInput.cardId : "";
    const card = tarotDeck.find((candidate) => candidate.id === cardId);
    if (!card) {
      throw new Error("Unknown card.");
    }
    if (!orientations.has(cardInput.orientation as Orientation)) {
      throw new Error("Unknown card orientation.");
    }
    return {
      position: spread.positions[index],
      card,
      orientation: cardInput.orientation as Orientation,
    };
  });

  const question = typeof body.question === "string" ? body.question.trim().slice(0, maxQuestionLength) : "";
  const reading: Reading = {
    question,
    spread,
    cards,
    createdAt: new Date().toISOString(),
  };

  return generatePrompt(reading);
}
