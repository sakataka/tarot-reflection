import type { Spread } from "../types/tarot";

export const spreads: Spread[] = [
  {
    id: "one-card",
    name: "1枚引き",
    description: "今見るべきことを一枚の象徴で整理します。",
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
    description: "過去・現在・未来の流れを見る基本的なスプレッドです。",
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
    description: "状況の背景から助言までをゆるやかにたどるスプレッドです。",
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
];

export const defaultSpread = spreads[1];
