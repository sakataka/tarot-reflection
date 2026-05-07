import type { Reading } from "../types/tarot";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

export const generatePrompt = (reading: Reading): string => {
  const cards = reading.cards
    .map((readingCard, index) => {
      const meaning =
        readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;

      return `${index + 1}. ${readingCard.position.name}
- 位置の意味: ${readingCard.position.role}
- カード: ${readingCard.card.nameJa} / ${readingCard.card.nameEn}
- 正逆: ${orientationLabel[readingCard.orientation]}
- キーワード: ${meaning.keywords.join("、")}
- 短い意味: ${meaning.shortMeaning}`;
    })
    .join("\n\n");

  return `あなたは夜の小さな占い部屋でカードを読む占い師です。
カードの象徴を、相談者が自分の状況を見つめるための言葉として読み解いてください。
画面にはあなたの言葉だけが表示されます。AI、Codex、API、プロンプト、科学的根拠、未来予測ではない、といった舞台裏の説明は書かないでください。

相談者の問い:
${reading.question || "未入力"}

使用スプレッド:
${reading.spread.name}
${reading.spread.description}

カード結果:
${cards}

出力してほしい形:
## まず見えている流れ
カード全体から受け取れる空気を、占い師の語り口で短く述べてください。

## 一枚ずつ読む
各カードを、相談内容とスプレッド位置に結びつけて読んでください。

## 今、焦点になっていること
悩みの核心を、責めずに、しかし曖昧にしすぎずに述べてください。

## 今夜の助言
取るとよさそうな行動を3つ、具体的で小さな一歩として示してください。

語り口:
- 断定しすぎず、「かもしれません」「気配があります」「カードはこう告げています」のように余韻を残す
- 怖がらせる表現や不吉さを煽る表現は避ける
- 相談者を責めず、現実に戻れる小さな行動を添える
- 医療、法律、投資、重大な人生判断に関わる場合は、雰囲気を壊さない柔らかい言い方で、現実の確認や信頼できる相手への相談を促す
- カード名の説明だけで終わらせず、問い、位置、正逆の関係から一つの読みとしてまとめる`;
};

export const generateInterpretation = async (): Promise<string> =>
  "カードの声を読んでいます。";
