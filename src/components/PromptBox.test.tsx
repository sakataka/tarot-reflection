import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { spreads } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { Reading } from "../types/tarot";
import { Gate } from "./PromptBox";

const readingFor = (spread: typeof spreads[number]): Reading => ({
  question: "問い",
  jumper: null,
  root: null,
  spread,
  cards: spread.positions.map((position, index) => ({ position, card: tarotDeck[index], orientation: "upright" })),
  createdAt: "2026-10-09T12:00:00Z",
});

const renderGate = (reading: Reading, cardIndex: number) => renderToStaticMarkup(
  <Gate reading={reading} segment={{ kind: "card", cardIndex, text: "" }} buttonRef={{ current: null }} answerTitle="今夜の答え" onOpen={() => undefined} />,
);

describe("narration card gates", () => {
  test("names every card gate in all supported spreads", () => {
    const ordinals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    for (const spread of spreads) {
      const reading = readingFor(spread);
      reading.cards.forEach((_, index) => {
        const markup = renderGate(reading, index);
        expect(markup).not.toContain("undefined");
        expect(markup).toContain(reading.cards.length === 1 ? "カードをめくる" : index === 0 ? "カードを返していく" : `${ordinals[index]}枚目をめくる`);
      });
    }
  });

  test("keeps the root-card cue separate from the ten spread cards", () => {
    const reading = readingFor(spreads.find((spread) => spread.id === "celtic-cross")!);
    reading.root = { ...reading.cards[0], position: { id: "root", name: "山の底", role: "根" } };
    expect(renderGate(reading, 10)).toContain("山の底をめくる");
  });
});
