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

  return `あなたはタロットカードの象徴を使って相談者の内省を助けるガイドです。
これは科学的な未来予測ではなく、カードの象徴を使って状況整理を行う遊び・内省支援です。

相談内容:
${reading.question || "未入力"}

使用スプレッド:
${reading.spread.name}
${reading.spread.description}

カード結果:
${cards}

回答してほしい内容:
1. 全体の流れ
2. 各カードの解釈
3. 今の悩みの核心
4. 注意したほうがよいこと
5. 取るとよさそうな行動
6. 今日できる小さな一歩を3つ

回答ルール:
- 未来を断定しない
- 怖がらせる表現を避ける
- 医療、法律、投資、重大な人生判断については、専門家相談や現実的な確認を促す
- 相談者を責めない
- 占いの雰囲気は残しつつ、現実的で前向きな助言にする
- カードの意味を単体で説明するだけでなく、相談内容とスプレッド位置に結びつけて読む`;
};

export const generateInterpretation = async (): Promise<string> =>
  "初期版ではAI APIへ接続しません。生成されたプロンプトをコピーして、Codex / ChatGPT などへ貼り付けてください。";
