export type Orientation = "upright" | "reversed";

export type Arcana = "major" | "minor";

export type Suit = "wands" | "cups" | "swords" | "pentacles";

export type Element = "fire" | "water" | "air" | "earth";

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
  // 小アルカナでスート共通の絵を使っているとき true。数字を絵の上に重ねて区別する。
  sharedArt?: boolean;
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

// 占い師と相談者のひと往復。
export type Exchange = {
  question: string;
  answer: string;
  // 聞き返しに添えた札。旧記録と、補足を引かない聞き返しでは省略する。
  clarifier?: { cardId: string; orientation: Orientation };
};

export type Reading = {
  question: string;
  spread: Spread;
  cards: ReadingCard[];
  // 混ぜている途中で表向きにこぼれたカード。卓の端に最初から表で置く。
  jumper: ReadingCard | null;
  // 引き終えた山の一番下のカード。最後に占い師がめくる。
  root: ReadingCard | null;
  // カードを引く前に、占い師が問い返したことと相談者の答え。
  clarification?: Exchange | null;
  createdAt: string;
};
