import { jumperPosition, rootPosition, spreads } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { Exchange, Orientation, Reading, ReadingCard, SpreadPosition } from "../types/tarot";
import { readingDayKey } from "./moment";

// 読み終えたあとに占い師へ聞き返せる回数。本物の占いと同じく、一晩に何度も重ねない。
export const maxFollowUps = 2;

// サーバーに残すリーディングの記録。カードはIDと向きだけを持ち、表示のときにデッキから引き直す。
export type CardRecord = { cardId: string; orientation: Orientation };

export type ReadingRecord = {
  id: string;
  question: string;
  spreadId: string;
  cards: CardRecord[];
  jumper: CardRecord | null;
  root: CardRecord | null;
  narration: string;
  // カードを引く前の問い返しと、読み終えたあとの聞き返し。
  clarification?: Exchange | null;
  followUps?: Exchange[];
  createdAt: string;
};

export const toCardRecord = (readingCard: ReadingCard): CardRecord => ({
  cardId: readingCard.card.id,
  orientation: readingCard.orientation,
});

// 占い師に渡す卓の状態。カードはIDと向きだけを送る。
export const tablePayload = (reading: Reading) => ({
  question: reading.question,
  spreadId: reading.spread.id,
  cards: reading.cards.map(toCardRecord),
  jumper: reading.jumper ? toCardRecord(reading.jumper) : null,
  root: reading.root ? toCardRecord(reading.root) : null,
  clarification: reading.clarification ?? null,
});

const toReadingCard = (record: CardRecord | null, position: SpreadPosition): ReadingCard | null => {
  const card = record && tarotDeck.find((candidate) => candidate.id === record.cardId);
  return card && record ? { card, orientation: record.orientation, position } : null;
};

export const readingFromRecord = (record: ReadingRecord): Reading | null => {
  const spread = spreads.find((item) => item.id === record.spreadId);
  if (!spread || record.cards.length !== spread.positions.length) return null;
  const cards = record.cards.map((cardRecord, index) => toReadingCard(cardRecord, spread.positions[index]));
  if (cards.some((card) => card === null)) return null;
  return {
    question: record.question,
    spread,
    cards: cards as ReadingCard[],
    jumper: toReadingCard(record.jumper, jumperPosition),
    root: toReadingCard(record.root, rootPosition),
    clarification: record.clarification ?? null,
    createdAt: record.createdAt,
  };
};

// 同じ問いかどうかは、空白・句読点・全角半角の違いを無視して比べる。
export const normalizeQuestion = (question: string) =>
  question
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");

// 同じ問いを同じ夜に二度たずねない、という古い作法。夜明け（4時）までは同じ夜とみなす。
export const findSameNightReading = (
  records: readonly ReadingRecord[],
  question: string,
  now = new Date(),
): ReadingRecord | undefined => {
  const key = normalizeQuestion(question);
  if (!key) return undefined;
  const today = readingDayKey(now);
  return records.find(
    (record) => readingDayKey(new Date(record.createdAt)) === today && normalizeQuestion(record.question) === key,
  );
};
