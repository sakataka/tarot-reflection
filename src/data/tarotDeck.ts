import type { Suit, TarotCard } from "../types/tarot";

type MajorSeed = {
  number: number;
  slug: string;
  nameJa: string;
  nameEn: string;
  upright: string[];
  uprightMeaning: string;
  reversed: string[];
  reversedMeaning: string;
};

const majorSeeds: MajorSeed[] = [
  { number: 0, slug: "fool", nameJa: "愚者", nameEn: "The Fool", upright: ["自由", "始まり", "冒険", "可能性", "無邪気さ"], uprightMeaning: "新しい始まりや自由な発想を示す。", reversed: ["無計画", "軽率", "迷い", "準備不足"], reversedMeaning: "準備不足や軽率さ、方向性の曖昧さを示す。" },
  { number: 1, slug: "magician", nameJa: "魔術師", nameEn: "The Magician", upright: ["意志", "創造", "技術", "始動"], uprightMeaning: "持っている力を使って物事を動かし始める時を示す。", reversed: ["空回り", "不誠実", "準備不足", "迷走"], reversedMeaning: "力の使い方が定まらず、言動が散りやすい状態を示す。" },
  { number: 2, slug: "high_priestess", nameJa: "女教皇", nameEn: "The High Priestess", upright: ["直感", "静けさ", "知性", "内面"], uprightMeaning: "急がず内側の声や違和感を確かめる必要を示す。", reversed: ["閉鎖性", "疑念", "感情の停滞", "秘密"], reversedMeaning: "考え込みすぎや情報不足で判断が曇りやすい状態を示す。" },
  { number: 3, slug: "empress", nameJa: "女帝", nameEn: "The Empress", upright: ["豊かさ", "育成", "安心", "受容"], uprightMeaning: "物事を育て、心地よい形に整える力を示す。", reversed: ["過保護", "停滞", "依存", "浪費"], reversedMeaning: "甘やかしや受け身が進展を鈍らせている可能性を示す。" },
  { number: 4, slug: "emperor", nameJa: "皇帝", nameEn: "The Emperor", upright: ["責任", "安定", "構造", "実行"], uprightMeaning: "現実的な枠組みと責任ある判断が助けになることを示す。", reversed: ["支配", "頑固", "硬直", "威圧"], reversedMeaning: "強引さや固定観念が柔軟な解決を妨げている可能性を示す。" },
  { number: 5, slug: "hierophant", nameJa: "教皇", nameEn: "The Hierophant", upright: ["学び", "信頼", "伝統", "助言"], uprightMeaning: "信頼できる知恵や既存の型を借りるとよい時を示す。", reversed: ["形式主義", "反発", "思い込み", "孤立"], reversedMeaning: "型に縛られすぎるか、助言を受け取れない状態を示す。" },
  { number: 6, slug: "lovers", nameJa: "恋人", nameEn: "The Lovers", upright: ["選択", "調和", "関係", "価値観"], uprightMeaning: "大切な関係や価値観に沿った選択を示す。", reversed: ["不一致", "迷い", "誘惑", "すれ違い"], reversedMeaning: "本音と選択がずれ、関係や判断に迷いが出ている状態を示す。" },
  { number: 7, slug: "chariot", nameJa: "戦車", nameEn: "The Chariot", upright: ["前進", "集中", "勝負", "統御"], uprightMeaning: "方向を決めて勢いよく進む力を示す。", reversed: ["暴走", "焦り", "制御不能", "停滞"], reversedMeaning: "勢いだけで進み、状況を見失いやすい状態を示す。" },
  { number: 8, slug: "strength", nameJa: "力", nameEn: "Strength", upright: ["忍耐", "勇気", "優しさ", "自制"], uprightMeaning: "力任せではなく穏やかな強さで向き合う必要を示す。", reversed: ["自信不足", "抑圧", "苛立ち", "弱気"], reversedMeaning: "自分の力を信じにくく、感情に振り回されやすい状態を示す。" },
  { number: 9, slug: "hermit", nameJa: "隠者", nameEn: "The Hermit", upright: ["内省", "探求", "静観", "洞察"], uprightMeaning: "一人で考える時間から大切な答えが見つかることを示す。", reversed: ["孤立", "閉じこもり", "迷路", "偏り"], reversedMeaning: "考えが内側で循環し、他者の視点が不足している状態を示す。" },
  { number: 10, slug: "wheel_of_fortune", nameJa: "運命の輪", nameEn: "Wheel of Fortune", upright: ["転機", "流れ", "変化", "好機"], uprightMeaning: "流れが変わり、状況が動き出す可能性を示す。", reversed: ["停滞", "想定外", "抵抗", "不安定"], reversedMeaning: "変化に抵抗したり、タイミングが噛み合いにくい状態を示す。" },
  { number: 11, slug: "justice", nameJa: "正義", nameEn: "Justice", upright: ["公平", "判断", "均衡", "責任"], uprightMeaning: "事実を見つめ、公平な判断をする必要を示す。", reversed: ["不公平", "偏見", "責任回避", "曖昧"], reversedMeaning: "見たいものだけを見て、判断が偏りやすい状態を示す。" },
  { number: 12, slug: "hanged_man", nameJa: "吊るされた男", nameEn: "The Hanged Man", upright: ["視点転換", "忍耐", "手放し", "受容"], uprightMeaning: "すぐ動くより、見方を変えることで意味が見えることを示す。", reversed: ["停滞疲れ", "自己犠牲", "固執", "報われなさ"], reversedMeaning: "我慢が目的化し、必要な手放しが遅れている状態を示す。" },
  { number: 13, slug: "death", nameJa: "死神", nameEn: "Death", upright: ["終わり", "再生", "区切り", "変容"], uprightMeaning: "古い形を終えて、新しい段階へ移る必要を示す。", reversed: ["執着", "先延ばし", "未練", "停滞"], reversedMeaning: "終えるべきものを手放せず、変化が遅れている状態を示す。" },
  { number: 14, slug: "temperance", nameJa: "節制", nameEn: "Temperance", upright: ["調整", "中庸", "回復", "統合"], uprightMeaning: "極端を避け、少しずつ整えることが助けになることを示す。", reversed: ["不均衡", "過不足", "焦り", "乱れ"], reversedMeaning: "生活や気持ちのバランスが崩れ、調整が必要な状態を示す。" },
  { number: 15, slug: "devil", nameJa: "悪魔", nameEn: "The Devil", upright: ["執着", "誘惑", "束縛", "欲望"], uprightMeaning: "離れにくい癖や依存的な関係に気づく必要を示す。", reversed: ["解放", "自覚", "距離", "改善"], reversedMeaning: "縛られていたものから距離を取り始める可能性を示す。" },
  { number: 16, slug: "tower", nameJa: "塔", nameEn: "The Tower", upright: ["崩壊", "衝撃", "真実", "刷新"], uprightMeaning: "古い前提が崩れ、見直しが避けられない状況を示す。", reversed: ["小さな警告", "回避", "不安", "先延ばし"], reversedMeaning: "大きな崩れを避けるために早めの修正が必要な状態を示す。" },
  { number: 17, slug: "star", nameJa: "星", nameEn: "The Star", upright: ["希望", "癒し", "展望", "信頼"], uprightMeaning: "先にある希望を見つめ、心を回復させる流れを示す。", reversed: ["失望", "不信", "疲れ", "見失い"], reversedMeaning: "希望が見えにくく、休息や視点の回復が必要な状態を示す。" },
  { number: 18, slug: "moon", nameJa: "月", nameEn: "The Moon", upright: ["不安", "夢", "曖昧さ", "直感"], uprightMeaning: "はっきりしない状況の中で、焦らず見極める必要を示す。", reversed: ["混乱の晴れ", "真相", "過敏", "疑念"], reversedMeaning: "不安の正体が見え始める一方、思い込みにも注意が必要な状態を示す。" },
  { number: 19, slug: "sun", nameJa: "太陽", nameEn: "The Sun", upright: ["成功", "喜び", "明るさ", "成長"], uprightMeaning: "素直さと前向きな表現が状況を明るくすることを示す。", reversed: ["過信", "遅れ", "照れ", "曇り"], reversedMeaning: "良い材料はあるが、表現不足や過信で曇りやすい状態を示す。" },
  { number: 20, slug: "judgement", nameJa: "審判", nameEn: "Judgement", upright: ["再起", "決断", "気づき", "呼びかけ"], uprightMeaning: "過去を踏まえて、新しい判断や再出発をする時を示す。", reversed: ["先送り", "後悔", "自己批判", "聞き逃し"], reversedMeaning: "必要な気づきや決断を先延ばしにしている状態を示す。" },
  { number: 21, slug: "world", nameJa: "世界", nameEn: "The World", upright: ["完成", "統合", "達成", "循環"], uprightMeaning: "一つの流れがまとまり、次の段階へ進める状態を示す。", reversed: ["未完", "停滞", "詰め不足", "区切れなさ"], reversedMeaning: "仕上げや区切りが足りず、次へ進みにくい状態を示す。" },
];

const suitLabels: Record<Suit, { ja: string; en: string; theme: string; imagePrefix: string }> = {
  wands: { ja: "ワンド", en: "Wands", theme: "情熱や行動力", imagePrefix: "wands" },
  cups: { ja: "カップ", en: "Cups", theme: "感情や関係性", imagePrefix: "cups" },
  swords: { ja: "ソード", en: "Swords", theme: "思考や言葉", imagePrefix: "swords" },
  pentacles: { ja: "ペンタクル", en: "Pentacles", theme: "現実面や資源", imagePrefix: "pentacles" },
};

const rankSeeds = [
  { number: 1, ja: "エース", en: "Ace", upright: ["始まり", "芽生え", "可能性"], reversed: ["停滞", "不安定", "準備不足"] },
  { number: 2, ja: "2", en: "Two", upright: ["調和", "選択", "均衡"], reversed: ["すれ違い", "迷い", "不均衡"] },
  { number: 3, ja: "3", en: "Three", upright: ["成長", "協力", "広がり"], reversed: ["足並みの乱れ", "未熟", "分散"] },
  { number: 4, ja: "4", en: "Four", upright: ["安定", "休息", "土台"], reversed: ["停滞", "閉塞", "固執"] },
  { number: 5, ja: "5", en: "Five", upright: ["変化", "葛藤", "課題"], reversed: ["回復", "見直し", "緊張緩和"] },
  { number: 6, ja: "6", en: "Six", upright: ["調整", "支援", "前進"], reversed: ["依存", "過去への固執", "停滞"] },
  { number: 7, ja: "7", en: "Seven", upright: ["探求", "試練", "選別"], reversed: ["迷走", "疑い", "疲労"] },
  { number: 8, ja: "8", en: "Eight", upright: ["継続", "集中", "改善"], reversed: ["惰性", "焦り", "過労"] },
  { number: 9, ja: "9", en: "Nine", upright: ["達成", "充足", "成熟"], reversed: ["満たされなさ", "油断", "孤立"] },
  { number: 10, ja: "10", en: "Ten", upright: ["完成", "区切り", "責任"], reversed: ["負担", "未整理", "抱え込み"] },
  { number: 11, ja: "ペイジ", en: "Page", upright: ["学び", "好奇心", "知らせ"], reversed: ["未熟", "散漫", "ためらい"] },
  { number: 12, ja: "ナイト", en: "Knight", upright: ["行動", "推進", "挑戦"], reversed: ["焦り", "暴走", "一貫性不足"] },
  { number: 13, ja: "クイーン", en: "Queen", upright: ["受容", "成熟", "育成"], reversed: ["過敏", "抱え込み", "偏り"] },
  { number: 14, ja: "キング", en: "King", upright: ["統率", "責任", "安定"], reversed: ["支配", "硬直", "過信"] },
];

const padMajor = (number: number) => String(number).padStart(2, "0");
const padMinor = (number: number) => String(number).padStart(2, "0");

const majorArcana: TarotCard[] = majorSeeds.map((seed) => ({
  id: `major_${padMajor(seed.number)}_${seed.slug}`,
  nameJa: seed.nameJa,
  nameEn: seed.nameEn,
  arcana: "major",
  number: seed.number,
  suit: null,
  upright: {
    keywords: seed.upright,
    shortMeaning: seed.uprightMeaning,
  },
  reversed: {
    keywords: seed.reversed,
    shortMeaning: seed.reversedMeaning,
  },
  imagePath: `/cards/major_${padMajor(seed.number)}_${seed.slug}.png`,
}));

const minorArcana: TarotCard[] = (Object.keys(suitLabels) as Suit[]).flatMap((suit) =>
  rankSeeds.map((rank) => {
    const suitLabel = suitLabels[suit];
    return {
      id: `${suitLabel.imagePrefix}_${padMinor(rank.number)}`,
      nameJa: `${suitLabel.ja}の${rank.ja}`,
      nameEn: `${rank.en} of ${suitLabel.en}`,
      arcana: "minor",
      number: rank.number,
      suit,
      upright: {
        keywords: [...rank.upright, suitLabel.theme],
        shortMeaning: `${suitLabel.theme}に関して、${rank.upright.join("・")}の流れを示す。`,
      },
      reversed: {
        keywords: [...rank.reversed, `${suitLabel.theme}の見直し`],
        shortMeaning: `${suitLabel.theme}に関して、${rank.reversed.join("・")}に注意が必要な状態を示す。`,
      },
      imagePath: `/cards/${suitLabel.imagePrefix}_${padMinor(rank.number)}.png`,
    };
  }),
);

export const tarotDeck: TarotCard[] = [...majorArcana, ...minorArcana];
