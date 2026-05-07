export type Orientation = "upright" | "reversed";

export type Arcana = "major" | "minor";

export type Suit = "wands" | "cups" | "swords" | "pentacles";

export type CardMeaning = {
  keywords: string[];
  shortMeaning: string;
};

export type TarotCard = {
  id: string;
  nameJa: string;
  nameEn: string;
  arcana: Arcana;
  number: number | null;
  suit: Suit | null;
  upright: CardMeaning;
  reversed: CardMeaning;
  imagePath: string;
};

export type SpreadPosition = {
  id: string;
  name: string;
  role: string;
};

export type Spread = {
  id: string;
  name: string;
  description: string;
  positions: SpreadPosition[];
};

export type DrawnCard = {
  card: TarotCard;
  orientation: Orientation;
};

export type SelectedCard = DrawnCard & {
  selectedOrder: number;
};

export type ReadingCard = {
  position: SpreadPosition;
  card: TarotCard;
  orientation: Orientation;
};

export type Reading = {
  question: string;
  spread: Spread;
  cards: ReadingCard[];
  createdAt: string;
};
