import type { Element, ReadingCard, Suit, TarotCard } from "../types/tarot";

// 並んだカード全体から、伝統的な読みの手がかりを機械的に数える。
// 解釈はしない。占い師（AI）に「卓の上にいま何があるか」を正確に渡すためのもの。

const suitElement: Record<Suit, Element> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth",
};

// 大アルカナの元素は黄金の夜明け団の照応（星座・惑星の元素）に従う。
const majorElement: Element[] = [
  "air", // 0 愚者（風）
  "air", // 1 魔術師（水星）
  "water", // 2 女教皇（月）
  "earth", // 3 女帝（金星）
  "fire", // 4 皇帝（牡羊座）
  "earth", // 5 教皇（牡牛座）
  "air", // 6 恋人（双子座）
  "water", // 7 戦車（蟹座）
  "fire", // 8 力（獅子座）
  "earth", // 9 隠者（乙女座）
  "fire", // 10 運命の輪（木星）
  "air", // 11 正義（天秤座）
  "water", // 12 吊るされた男（水）
  "water", // 13 死神（蠍座）
  "fire", // 14 節制（射手座）
  "earth", // 15 悪魔（山羊座）
  "fire", // 16 塔（火星）
  "air", // 17 星（水瓶座）
  "water", // 18 月（魚座）
  "fire", // 19 太陽（太陽）
  "fire", // 20 審判（火）
  "earth", // 21 世界（土星）
];

export const elementLabel: Record<Element, string> = {
  fire: "火",
  water: "水",
  air: "風",
  earth: "地",
};

const suitLabel: Record<Suit, string> = {
  wands: "ワンド（火・意志と行動）",
  cups: "カップ（水・感情と関係）",
  swords: "ソード（風・思考と言葉）",
  pentacles: "ペンタクル（地・現実と身体）",
};

const numberMeaning: Record<number, string> = {
  1: "始まり・種",
  2: "選択・釣り合い",
  3: "広がり・実り始め",
  4: "安定・足場",
  5: "揺らぎ・試練",
  6: "調和・受け渡し",
  7: "見極め・内省",
  8: "動き・鍛錬",
  9: "成熟・ひとりで満ちること",
  10: "完結・次への持ち越し",
};

export const cardElement = (card: TarotCard): Element =>
  card.suit ? suitElement[card.suit] : majorElement[card.number ?? 0];

export type Dignity = "same" | "friendly" | "neutral" | "contrary";

// エレメンタル・ディグニティ。同じ元素は強め合い、火と風・水と地は助け合い、火と水・風と地は打ち消し合う。
export const elementDignity = (a: Element, b: Element): Dignity => {
  if (a === b) return "same";
  const pair = new Set([a, b]);
  const has = (x: Element, y: Element) => pair.has(x) && pair.has(y);
  if (has("fire", "air") || has("water", "earth")) return "friendly";
  if (has("fire", "water") || has("air", "earth")) return "contrary";
  return "neutral";
};

const dignityText: Record<Dignity, string> = {
  same: "同じ元素で、互いの力を強め合う",
  friendly: "助け合う元素で、流れがなめらか",
  neutral: "つかず離れずの関係",
  contrary: "打ち消し合う元素で、互いの力を弱め合う（摩擦・綱引き）",
};

// クインテッセンス：大アルカナの番号と小アルカナの数札（1〜10）を足し、22未満になるまで各桁を足す。
// 並び全体の底に流れる大アルカナとして読む。コートカードは数えない。
export const quintessence = (cards: readonly TarotCard[]): number | null => {
  const numbers = cards.filter((card) => card.arcana === "major" || (card.number ?? 0) <= 10).map((card) => card.number ?? 0);
  if (numbers.length === 0) return null;
  let total = numbers.reduce((sum, value) => sum + value, 0);
  while (total > 21) {
    total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return total;
};

export type TableObservation = {
  id: string;
  text: string;
};

export const observeTable = (cards: readonly ReadingCard[], majorArcana: readonly TarotCard[]): TableObservation[] => {
  const observations: TableObservation[] = [];
  const total = cards.length;
  const majors = cards.filter(({ card }) => card.arcana === "major");
  const minors = cards.filter(({ card }) => card.arcana === "minor");

  // 元素の関係は一枚引きでは生まれない。隣り合う札の組み合わせを並び順に見る。
  for (let index = 0; index + 1 < total; index += 1) {
    const left = cards[index];
    const right = cards[index + 1];
    const leftElement = cardElement(left.card);
    const rightElement = cardElement(right.card);
    const dignity = elementDignity(leftElement, rightElement);
    if (dignity === "neutral") continue;
    observations.push({
      id: `dignity-${index}`,
      text: `${left.position.name}の${left.card.nameJa}（${elementLabel[leftElement]}）と${right.position.name}の${right.card.nameJa}（${elementLabel[rightElement]}）は隣り合い、${dignityText[dignity]}。`,
    });
  }

  if (total < 3) return observations;

  if (majors.length === 0) {
    observations.push({ id: "majors", text: "大アルカナが一枚もない。大きな運命の流れというより、日々の手の届く範囲で動かせる話。" });
  } else if (majors.length / total >= 0.5) {
    observations.push({
      id: "majors",
      text: `${total}枚中${majors.length}枚が大アルカナ（${majors.map(({ card }) => card.nameJa).join("・")}）。個人の手に余る大きな流れや、人生の節目の中にいる。`,
    });
  }

  const suitCounts = new Map<Suit, number>();
  for (const { card } of minors) {
    if (card.suit) suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
  }
  const ranked = [...suitCounts.entries()].sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  if (top && top[1] >= 2 && (!second || top[1] > second[1]) && top[1] / total >= 0.4) {
    observations.push({ id: "suit-dominant", text: `${suitLabel[top[0]]}が${top[1]}枚と多い。問いの重心がこの領域にある。` });
  }
  if (total >= 5) {
    const missing = (Object.keys(suitLabel) as Suit[]).filter((suit) => !suitCounts.has(suit));
    if (missing.length > 0 && missing.length < 4) {
      observations.push({
        id: "suit-missing",
        text: `${missing.map((suit) => suitLabel[suit]).join("と")}が一枚もない。その領域が置き去りになっているか、見えていない。`,
      });
    }
  }

  const ranks = new Map<number, ReadingCard[]>();
  for (const readingCard of minors) {
    const rank = readingCard.card.number ?? 0;
    if (rank <= 10) ranks.set(rank, [...(ranks.get(rank) ?? []), readingCard]);
  }
  for (const [rank, group] of ranks) {
    if (group.length < 2) continue;
    observations.push({
      id: `rank-${rank}`,
      text: `数字の${rank}が${group.length}枚重なる（${group.map(({ card }) => card.nameJa).join("・")}）。${numberMeaning[rank]}の段階が強調されている。`,
    });
  }

  const courts = minors.filter(({ card }) => (card.number ?? 0) > 10);
  if (courts.length >= 2) {
    observations.push({
      id: "courts",
      text: `人物札が${courts.length}枚（${courts.map(({ card }) => card.nameJa).join("・")}）。問いに関わる実在の人たち、またはあなたの中の複数の顔として読める。`,
    });
  } else if (courts.length === 1) {
    const court = courts[0];
    observations.push({
      id: "courts",
      text: `人物札の${court.card.nameJa}が${court.position.name}に出ている。実在の誰か、またはあなた自身のある一面として読める。`,
    });
  }

  const reversed = cards.filter(({ orientation }) => orientation === "reversed").length;
  if (reversed === 0) {
    observations.push({ id: "orientation", text: "すべて正位置。流れに滞りが少なく、カードの力が素直に出ている。" });
  } else if (reversed === total) {
    observations.push({ id: "orientation", text: "すべて逆位置。力が内側にこもっているか、まだ表に出る準備ができていない。" });
  } else if (reversed / total > 0.5) {
    observations.push({ id: "orientation", text: `${total}枚中${reversed}枚が逆位置。滞りや内向きの力が目立つ。` });
  }

  const essence = quintessence(cards.map(({ card }) => card));
  const essenceCard = essence === null ? undefined : majorArcana.find((card) => card.number === essence);
  if (essenceCard) {
    observations.push({
      id: "quintessence",
      text: `数の総和をたどると（クインテッセンス）、並び全体の底に「${essenceCard.nameJa}」がいる。卓には出ていない、この並びの芯。`,
    });
  }

  return observations;
};
