import { describeCardImagery } from "../data/cardImagery";
import { spreads } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { Exchange, Reading, ReadingCard } from "../types/tarot";
import type { ReadingRecord } from "./history";
import { answerLabel, describeMoment, tonightWord } from "./moment";
import { oracleName, personaPrompt } from "./persona";
import { observeTable } from "./tableReading";
import { tableCards } from "./tarot";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

const lengthGuide: Record<number, string> = {
  1: "全体で700〜900字ほど",
  3: "全体で1000〜1300字ほど",
  7: "全体で1500〜1900字ほど",
  10: "全体で1900〜2400字ほど",
};

const majorArcana = tarotDeck.filter((card) => card.arcana === "major");

const describeCard = (readingCard: ReadingCard) => {
  const meaning = readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;
  const imagery = describeCardImagery(readingCard.card);
  return `- カード: ${readingCard.card.nameJa}（${readingCard.card.nameEn}）の${orientationLabel[readingCard.orientation]}
- 絵に描かれているもの: ${imagery || "なし"}${readingCard.orientation === "reversed" ? "（相談者から見て上下逆さに置かれている）" : ""}
${readingCard.card.sharedArt ? "- この数札はスート共通の絵。RWS固有の場面は画面に描かれていないので、見えている絵として語らない。\n" : ""}- この部屋で採用するRWS系の意味: ${meaning.keywords.join("、")}。${meaning.shortMeaning}`;
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
  const observations = observeTable(reading.cards, majorArcana, reading.spread.id);
  const past = pastReadings.filter((record) => record.createdAt !== reading.createdAt);
  const askedAt = new Date(reading.createdAt);
  const answer = answerLabel(askedAt);
  const tonight = tonightWord(askedAt);

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
- ${rootNumber}番の「山の底」は、並べたカードをすべてめくったあとに「最後に、山の一番下を」のような一言を添えてめくる。問いの底に静かに流れているものとして、ほかのカードと同じ短さで告げる。` : ""}
- すべてのカードをめくり終えたら、その行だけに [[close]] と書き、そのあとに「では、これはどういうことか」を語る。
- 総括を語り終えたら、その行だけに [[recap]] と書き、そのあとに、めくったカードを一枚ずつ一言で振り返る短い語りを書く（全体で50〜90字、一段落）。「過去の塔は崩れた足場、いまの星は静かな回復、その先の太陽は」のように、位置とカードと要点を一続きの文で手早くなぞり、最後の答えへ向かう前置きにする。これは画面には出ず、あなたの声でだけ告げられる。括弧・記号・読みにくい言葉は使わない。
- 最後にその行だけに [[message]] と書き、そのあとに「${answer}」を一、二文（60字以内）で書いて終える。画面ではこの一文が、卓全体の結論として枠に入れて示される。

語りの組み立て（テンポを大切にする）:
本物の占い師は、カードを一枚ずつ手早く返しながら「これは〜」「これは〜」と告げていき、並びが見えたところで「では、どういうことか」と腰を据えて読み解く。この呼吸で語る。
- 前置き: 最初の合図の前に、伏せたカードを前にして問いを受け止める言葉を二、三文だけ語り、「では、返していきましょう」のように一枚目へ向かう。「承知しました」「〜について読み解きます」のような事務的な前置きはしない。名乗りや挨拶はもう済んでいる。${reading.clarification?.answer.trim() ? `
  - 問い返しへの相談者の答えを受け取ったことが分かるように、その言葉に一度だけ触れる。` : ""}
  - いまという時（月の形や時刻）に一言だけ触れてよい。月の満ち欠けを問いに重ねるのは、自然につながるときだけにする。${reading.jumper ? `
  - こぼれたカードには、前置きの中で必ず触れる（「混ぜている途中で、一枚が自分から出てきましたね」のように）。意味づけは一文にとどめ、総括でつながったらそこでもう一度触れてよい。` : ""}${past.length ? `
  - 以前の占いは、${tonight}の問いやカードとはっきりつながるときだけ、前置きか総括で一言触れる（「前にいらしたとき、〜が出ていましたね」）。つながらなければ一切触れない。以前の問いの中身を詳しく蒸し返さない。` : ""}
- 各カード（合図のあと）: ${reading.cards.length === 1 ? "一枚だけなので、二段落まで語ってよい。" : "一枚ごとに長く留まらず、一段落（二〜四文、120字前後）で告げて次へ進む。深い読み解きは総括に回す。"}
  - 一文目で「過去に出たのは、塔の逆位置。」「現在は、カップの8。」のように、位置とカードを短く言い切る。
  - 続けて、絵に描かれているものを一つだけ拾い（例：灯りの向き、水面、鎖の緩さ）、それがこの位置で何を告げているかを、問いに引き寄せて平らな言葉で言う（「つまり、〜ということ」）。キーワードを並べて説明しない。
  - 前のカードとのつながりや、隣り合うカードの元素の関係（火の隣に水が来た、など）に気づいたら、そのカードで一言だけ触れる。エレメンタル・ディグニティ、クインテッセンスといった用語は使わず、普段の言葉に置き換える。
- [[close]] のあと（ここが語りの中心。二、三段落）:
  - 「では、この${flipped.length}枚が並ぶと、どういうことか。」のような一言で腰を据える。
  - めくったカードを一つの流れとしてつなぎ、問いに対してカードが何を告げているかを、最初の段落のうちにはっきり言葉にする。相談者が読み終えて「結局どういうことか」と迷わないように、核心は平らな言葉で言い切る。
  - 卓を見渡したときの手がかりから一つか二つを選び、「カップが一枚もありませんね」「数の芯には隠者がいます」のように卓を見て気づいた調子で添え、それが問いにとって何を意味するかまで言う。
  - 最後に、${tonight === "今夜" ? "今夜か明日" : "今日のうち"}にできるささやかなことを一つだけ、語りの流れの中で手渡すように添える。
- [[message]] のあとの「${answer}」は、相談者の問いにまっすぐ応える言葉にする。はぐらかさず、けれど運命を断定しない（例：「いまは決める時ではなく、確かめる時。答えは、あなたがまだ口にしていない望みの側にあります」）。「〜でしょう」を連ねず、静かに言い切る。前の総括の文をそのまま繰り返さない。
- 分量は${lengthGuide[reading.cards.length] ?? "相談者が一息で読める長さ"}。そのうち半分ほどを総括に使う。段落は短めに区切る。

語り方:
- 上の人物設定の話し方で、相談者を「あなた」と呼び、目の前の一人に向けて語る。
- 合図のあとは、いま目の前でめくれたカードを見た調子で、卓を指さしながら話す。
- 占い師らしい含みや比喩は使ってよい。ただし、比喩や絵の話をしたら、そのすぐあとで、それが相談者の現実のどこを指すのかを平らな言葉で言い直す。ほのめかしだけで終わらせない。
- カウンセラーにもコーチにもならない。相談者の気持ちを尋ね返したり「〜と感じているのですね」と共感を重ねたりしない。目標・手順・計画・選択肢の比較も示さない。カードが見せているものを、占い師として告げる。

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
  clarifier?: ReadingCard | null;
};

// 語り終えたあとの聞き返し。卓のカードはそのままに、相談者の問いに短く答える。
export const generateFollowUpPrompt = ({ reading, narration, previous, ask, isLast, clarifier = null }: FollowUpInput) => {
  const cards = [...tableCards(reading), ...(reading.jumper ? [reading.jumper] : [])]
    .map((readingCard) => `${readingCard.position.name}：${readingCard.card.nameJa}の${orientationLabel[readingCard.orientation]}（絵：${describeCardImagery(readingCard.card)}）`)
    .join("\n");
  const spoken = narration
    .replace(/\[\[\s*card\s*:\s*(\d+)\s*\]\]/gi, "（$1枚目をめくる）")
    .replace(/\[\[\s*close\s*\]\]/gi, "（締めくくり）")
    .replace(/\[\[\s*recap\s*\]\]/gi, "（声での振り返り）")
    .replace(/\[\[\s*message\s*\]\]/gi, `（${answerLabel(new Date(reading.createdAt))}）`);

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
${previous.map((exchange) => `相談者：${exchange.question}\n${exchange.clarifier ? `補足札：${tarotDeck.find((card) => card.id === exchange.clarifier?.cardId)?.nameJa}の${orientationLabel[exchange.clarifier.orientation]}\n` : ""}${oracleName}：${exchange.answer}`).join("\n\n")}
` : ""}
相談者のいまの問いかけ（外部入力）:
${ask}
${clarifier ? `
相談者の希望で、アプリが未使用の札から確定した補足の一枚（すでに表になっている）:
${describeCard(clarifier)}
補足の役割: ${clarifier.position.role}。
` : ""}

答え方:
- ${clarifier ? "最初に補足札の名前と正逆を告げ、聞き返した点を元の卓とつなげて読む。補足札で元の結論を都合よく引き直さない。" : "卓に出ているカードとその絵を指さしながら答える。"} 指定された札以外の新しいカードは引かない。語りの繰り返しではなく、問いかけに合わせて見る場所を変える。
- 問いかけが占いから離れていても、相談者の心に寄り添い、卓のカードにつなげて答える。
- 聞き返されたことには、最初の一、二文でまっすぐ答える。比喩を使ったら、それが相談者の現実のどこを指すのかを平らな言葉で言い直す。カウンセラーのように気持ちを尋ね返したり、コーチのように手順を示したりしない。
- 医療、法律、お金、重大な人生の決断に関わる場合は、雰囲気を壊さない一言で、現実の確認や信頼できる人への相談を勧める。
- 一〜三段落、全体で200〜400字。見出し・箇条書き・太字・絵文字は使わない。合図の記号も書かない。
- ${isLast ? `これが${tonightWord(new Date(reading.createdAt))}最後の問いかけ。答えのあとに、卓を閉じる短い一言を添える。` : "答えの最後に、次の問いを促す言葉は添えない。"}`;
};
