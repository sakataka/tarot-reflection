import type { Spread, SpreadPosition } from "../types/tarot";

export const spreads: Spread[] = [
  {
    id: "one-card",
    name: "1枚引き",
    description: "一枚だけ引いて、いまのあなたに必要なひとことを受け取ります。",
    positions: [
      {
        id: "theme",
        name: "今日のテーマ",
        role: "今見るべきこと",
      },
    ],
  },
  {
    id: "three-card",
    name: "3枚引き",
    description: "過去・現在・未来。流れのなかに、いまを置いて見つめます。",
    positions: [
      {
        id: "past",
        name: "過去",
        role: "今の状況につながる背景",
      },
      {
        id: "present",
        name: "現在",
        role: "今の中心テーマ",
      },
      {
        id: "future",
        name: "未来",
        role: "今の流れの延長にある可能性",
      },
    ],
  },
  {
    id: "horseshoe-seven",
    name: "7枚ホースシュー",
    description: "蹄鉄の形に七枚。背景から行く先まで、じっくりとたどります。",
    positions: [
      {
        id: "past",
        name: "過去",
        role: "今の状況につながる背景",
      },
      {
        id: "present",
        name: "現在",
        role: "今の中心テーマ",
      },
      {
        id: "hidden-influence",
        name: "隠れた影響",
        role: "表には出にくい要因や気分",
      },
      {
        id: "obstacle",
        name: "障害",
        role: "進みにくさを生んでいるもの",
      },
      {
        id: "surroundings",
        name: "周囲の状況",
        role: "人間関係や環境からの影響",
      },
      {
        id: "advice",
        name: "アドバイス",
        role: "今取り入れるとよさそうな視点",
      },
      {
        id: "near-future",
        name: "近未来",
        role: "今の流れの延長にある可能性",
      },
    ],
  },
  {
    id: "celtic-cross",
    name: "10枚ケルト十字",
    description: "十字と右の四枚で、状況・背景・あなたの姿勢・行く先を深く読みます。",
    positions: [
      { id: "situation", name: "現在の状況", role: "問いを取り巻く中心的な状況や影響" },
      { id: "crossing", name: "交差する力", role: "状況に交差する障害や課題。良い札でもこの状況では妨げになることがある" },
      { id: "crown", name: "目指すもの", role: "意識している目標や理想、まだ実現していない可能性" },
      { id: "foundation", name: "土台", role: "すでに形になっている背景や、状況を支える根本" },
      { id: "past", name: "過ぎゆく影響", role: "過ぎた、または過ぎつつある影響" },
      { id: "near-future", name: "近づく影響", role: "これから近い時期に動き始める影響" },
      { id: "self", name: "あなたの姿勢", role: "この状況における相談者自身の立ち位置や向き合い方" },
      { id: "environment", name: "周囲", role: "環境や身近な人々が問いに及ぼす影響" },
      { id: "hopes-fears", name: "望みと恐れ", role: "相談者が望んでいること、または恐れていること" },
      { id: "outcome", name: "行く先", role: "これらの影響が今のまま続いた場合の到達点。固定された運命ではない" },
    ],
  },
];

// 左の十字と、右の下から上へ並ぶ四枚。2枚目の横向きの配置と正逆位置は別に扱う。
export const celticCrossLayout = [
  { x: 1.25, y: 1.6 }, { x: 1.25, y: 1.8 },
  { x: 1.25, y: 0 }, { x: 1.25, y: 3.2 },
  { x: 0, y: 1.6 }, { x: 2.5, y: 1.6 },
  { x: 4, y: 4.35 }, { x: 4, y: 2.9 },
  { x: 4, y: 1.45 }, { x: 4, y: 0 },
];

export const clarifierPosition: SpreadPosition = {
  id: "clarifier", name: "補足の一枚", role: "聞き返した点を掘り下げる補足。元の札の意味や結論を置き換えない",
};

export const defaultSpread = spreads[1];

// スプレッドの外に置かれるカード。どの並べ方でも同じ役割で読む。
export const jumperPosition: SpreadPosition = {
  id: "jumper",
  name: "こぼれたカード",
  role: "混ぜている途中で自ら飛び出した、見落とさないでほしい知らせ",
};

export const rootPosition: SpreadPosition = {
  id: "root",
  name: "山の底",
  role: "問いの底に静かに流れているもの",
};
