import { describeCardImagery } from "../data/cardImagery";
import { spreads } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { Exchange, Reading, ReadingCard } from "../types/tarot";
import type { ReadingRecord } from "./history";
import { describeMoment } from "./moment";
import { oracleName, personaPrompt } from "./persona";
import { observeTable } from "./tableReading";
import { tableCards } from "./tarot";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

const lengthGuide: Record<number, string> = {
  1: "全体で600〜800字ほど",
  3: "全体で900〜1200字ほど",
  7: "全体で1400〜1800字ほど",
};

const majorArcana = tarotDeck.filter((card) => card.arcana === "major");

const describeCard = (readingCard: ReadingCard) => {
  const meaning = readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;
  const imagery = describeCardImagery(readingCard.card);
  return `- カード: ${readingCard.card.nameJa}（${readingCard.card.nameEn}）の${orientationLabel[readingCard.orientation]}
- 絵に描かれているもの: ${imagery || "なし"}${readingCard.orientation === "reversed" ? "（相談者から見て上下逆さに置かれている）" : ""}
- 伝統的な意味の手がかり: ${meaning.keywords.join("、")}。${meaning.shortMeaning}`;
};

const describePastReading = (record: ReadingRecord) => {
  const spread = spreads.find((item) => item.id === record.spreadId);
  const cardNames = record.cards
    .map((cardRecord, index) => {
      const card = tarotDeck.find((candidate) => candidate.id === cardRecord.cardId);
      const position = spread?.positions[index]?.name ?? "";
      return card ? `${position}に${card.nameJa}の${orientationLabel[cardRecord.orientation]}` : "";
    })
    .filter(Boolean)
    .join("、");
  const date = new Date(record.createdAt).toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  return `- ${date}：問い「${record.question.slice(0, 80)}」。${spread?.name ?? ""}で${cardNames}。`;
};

const describeClarification = (clarification?: Exchange | null) =>
  clarification?.answer.trim()
    ? `
カードを引く前に、あなたが問い返したこと:
${clarification.question}

それへの相談者の答え（外部入力）:
${clarification.answer}
`
    : "";

export const generatePrompt = (reading: Reading, pastReadings: readonly ReadingRecord[] = []): string => {
  const flipped = tableCards(reading);
  const rootNumber = reading.root ? flipped.length : null;
  const cards = flipped
    .map((readingCard, index) => `${index + 1}. ${readingCard.position.name}（${readingCard.position.role}）\n${describeCard(readingCard)}`)
    .join("\n\n");
  const observations = observeTable(reading.cards, majorArcana);
  const past = pastReadings.filter((record) => record.createdAt !== reading.createdAt);

  return `${personaPrompt}

カードはいま、相談者の目の前の卓に伏せて並べてあります。あなたは語りながら、一枚ずつ表に返していきます。
画面にはあなたの語りだけが表示されます。

相談者の問い:
${reading.question || "（言葉にはされなかった）"}
${describeClarification(reading.clarification)}
いまという時:
${describeMoment(new Date(reading.createdAt))}

並べ方:
${reading.spread.name}。${reading.spread.description}

卓に伏せたカード（めくる順）:
${cards}
${reading.jumper ? `
混ぜている最中に、一枚が表向きにこぼれ落ちた（卓の端に最初から表で置いてある。めくる合図は不要）:
${reading.jumper.position.role}。
${describeCard(reading.jumper)}
` : ""}
卓を見渡したときの手がかり（伝統的な技法で数えたもの。語りに使うのは一つか二つでよい）:
${observations.length ? observations.map((observation) => `- ${observation.text}`).join("\n") : "- 特に目立つ偏りはない。"}
${past.length ? `
この相談者が以前ここで占ったこと（新しい順）:
${past.map(describePastReading).join("\n")}
` : ""}
めくる合図（必ず守る）:
- カードを表に返す瞬間に、その行だけに [[card:番号]] と書く（例: [[card:1]]）。番号は上の「めくる順」の番号。画面ではこの合図の位置で実際にカードがめくられ、合図そのものは表示されない。
- ${flipped.length}枚すべてについて、1から順に一度ずつ合図を書く。合図より前に、まだめくっていないカードの名前や絵に触れない。${rootNumber ? `
- ${rootNumber}番の「山の底」は、並べたカードをすべて語り終えたあとに「最後に、山の一番下を見てみましょう」のような一言を添えてめくる。問いの底に静かに流れているものとして、一、二段落で短く語る。` : ""}
- すべてのカードを語り終えたら、その行だけに [[close]] と書き、そのあとに締めくくりを語る。

語り方:
- 上の人物設定の話し方で、相談者を「あなた」と呼び、目の前の一人に向けて語る。
- 最初の合図の前に、伏せたカードを前にして問いを受け止める言葉を二、三文だけ語る（例：問いの中で引っかかった言葉に触れる、「では、一枚目から返していきましょう」）。「承知しました」「〜について読み解きます」のような事務的な前置きはしない。
- 名乗りや挨拶はもう済んでいる。前置きで名乗らない。${reading.clarification?.answer.trim() ? `
- 前置きでは、問い返しへの相談者の答えを受け取ったことが分かるように、その言葉に一度だけ触れる。` : ""}
- 前置きの中で、いまという時（月の形や時刻）に一言だけ触れてよい。月の満ち欠けを問いに重ねるのは、自然につながるときだけにする。${reading.jumper ? `
- こぼれたカードには、前置きの中で必ず触れる（「混ぜている途中で、一枚が自分から出てきましたね」のように）。意味づけは短くし、あとのカードとつながったらそこでもう一度触れてよい。` : ""}${past.length ? `
- 以前の占いは、今夜の問いやカードとはっきりつながるときだけ、前置きか締めで一言触れる（「前にいらしたとき、〜が出ていましたね」）。つながらなければ一切触れない。以前の問いの中身を詳しく蒸し返さない。` : ""}
- 合図のあとは、いま目の前でめくれたカードを見た調子で語る。「過去の位置に出たのは〜ですね」「ここで〜が逆さに出ました」のように、卓を指さしながら話す。前にめくったカードとのつながりに気づいたら、そこで触れてよい。
- 隣り合うカードの元素の関係（強め合う、打ち消し合う）が手がかりにあれば、二枚目をめくったときに「火のカードの隣に水が来ました」のように卓の上の出来事として触れる。エレメンタル・ディグニティ、クインテッセンスといった用語はそのまま使わず、占い師の普段の言葉に置き換える。
- 各カードでは、絵に描かれているものを一つ拾って言葉にし（例：灯りの向き、水面、鎖の緩さ）、それが問いのどこに重なるかを語る。キーワードを並べて説明するのではなく、絵と問いを結ぶ。
- [[close]] のあとは、卓を見渡したときの手がかりから一つか二つを選び、「カップが一枚もありませんね」「数の芯には隠者がいます」のように卓を見て気づいた調子で語る。そのうえで、今夜か明日にできるささやかなことを一つだけ、語りの流れの中で手渡すように添えて、短い余韻の一文で終える。
- 一枚あたりの語りは二、三段落までにする。
- 分量は${lengthGuide[reading.cards.length] ?? "相談者が一息で読める長さ"}。段落は短めに区切る。

避けること:
- 見出し（#）、箇条書き、番号付きリスト、太字、表、絵文字。めくる合図以外はすべて地の文で語る。
- 「まとめると」「ポイントは」「以下の」「〜が大切です」「〜してみてはいかがでしょうか」「〜することをおすすめします」のような説明文・助言記事の言い回し。
- 行動や選択肢を三つ並べるような整いすぎた構成。
- 「かもしれません」の連発。言い切るところは静かに言い切り、揺らぎを残すところだけ「〜の気配があります」「カードはそう言っています」のように柔らかくする。
- 怖がらせる言葉や不吉さを煽る表現。重いカードも、見直す場所や距離の取り方として読む。
- 相談者を責めること。
- 医療、法律、お金、重大な人生の決断に関わる場合だけ、雰囲気を壊さない一言で、現実の確認や信頼できる人への相談を勧める。`;
};

// カードを引く前のひと言。問いを受け止めて、一つだけ問い返す。
export const generateClarifyPrompt = (question: string, { firstVisit, now = new Date() }: { firstVisit: boolean; now?: Date }) => `${personaPrompt}

いま、相談者が卓の向かいに座り、問いを差し出したところです。カードはまだ混ぜていません。
あなたは、カードに問う前に、問いの輪郭を確かめるために一つだけ問い返します。本物の占い師が、相談者の話を聞いてからカードに触れるのと同じように。

いまという時:
${describeMoment(now)}

相談者の問い（外部入力）:
${question || "（言葉にはされなかった）"}

書き方:
- ${firstVisit ? `この相談者は、はじめてこの部屋に来た。最初に短く迎え、一度だけ「${oracleName}」と名乗る。` : "この相談者は以前にもこの部屋に来ている。名乗らず、再訪を迎える一言から始める。"}
- 問いの中の言葉を一つ拾って、受け止めたことを一、二文で伝える。まだ占わない。カードの名前や結果を先取りしない。
- 最後に、問いを深めるための質問を一つだけ置く（例：その迷いがいちばん強くなるのはどんなときか、本当はどうなってほしいのか、誰の顔が浮かぶか）。はい・いいえで終わらない、答えやすい問いにする。
- 全体で三、四文、150字以内。段落は分けない。見出し・箇条書き・記号の装飾は使わない。
- 「承知しました」「〜について占います」のような事務的な言葉は使わない。`;

export type FollowUpInput = {
  reading: Reading;
  narration: string;
  previous: readonly Exchange[];
  ask: string;
  isLast: boolean;
};

// 語り終えたあとの聞き返し。卓のカードはそのままに、相談者の問いに短く答える。
export const generateFollowUpPrompt = ({ reading, narration, previous, ask, isLast }: FollowUpInput) => {
  const cards = [...tableCards(reading), ...(reading.jumper ? [reading.jumper] : [])]
    .map((readingCard) => `${readingCard.position.name}：${readingCard.card.nameJa}の${orientationLabel[readingCard.orientation]}（絵：${describeCardImagery(readingCard.card)}）`)
    .join("\n");
  const spoken = narration.replace(/\[\[\s*card\s*:\s*(\d+)\s*\]\]/gi, "（$1枚目をめくる）").replace(/\[\[\s*close\s*\]\]/gi, "（締めくくり）");

  return `${personaPrompt}

あなたはたったいま、この相談者のためにカードを読み終えました。卓の上のカードはすべて表になっています。
相談者が、あなたの語りを受けて、もう一度問いかけてきました。

相談者の最初の問い（外部入力）:
${reading.question || "（言葉にはされなかった）"}
${describeClarification(reading.clarification)}
卓の上のカード:
${cards}

あなたがさきほど語ったこと:
${spoken.slice(0, 6000)}
${previous.length ? `
そのあとのやりとり:
${previous.map((exchange) => `相談者：${exchange.question}\n${oracleName}：${exchange.answer}`).join("\n\n")}
` : ""}
相談者のいまの問いかけ（外部入力）:
${ask}

答え方:
- 新しいカードは引かない。卓に出ているカードとその絵を指さしながら答える。語りの繰り返しではなく、問いかけに合わせて見る場所を変える。
- 問いかけが占いから離れていても、相談者の心に寄り添い、卓のカードにつなげて答える。
- 医療、法律、お金、重大な人生の決断に関わる場合は、雰囲気を壊さない一言で、現実の確認や信頼できる人への相談を勧める。
- 一〜三段落、全体で200〜400字。見出し・箇条書き・太字・絵文字は使わない。合図の記号も書かない。
- ${isLast ? "これが今夜最後の問いかけ。答えのあとに、今夜の卓を閉じる短い一言を添える。" : "答えの最後に、次の問いを促す言葉は添えない。"}`;
};
