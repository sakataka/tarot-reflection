import { describe, expect, test } from "bun:test";
import { spreads } from "../data/spreads";
import { tarotDeck } from "../data/tarotDeck";
import type { Orientation, ReadingCard } from "../types/tarot";
import { cardElement, elementDignity, observeTable, quintessence } from "./tableReading";

const card = (id: string) => {
  const found = tarotDeck.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

const majors = tarotDeck.filter((item) => item.arcana === "major");

const lay = (spreadId: string, ids: string[], orientation: Orientation = "upright"): ReadingCard[] => {
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) throw new Error("spread missing");
  return ids.map((id, index) => ({ card: card(id), orientation, position: spread.positions[index] }));
};

describe("elements", () => {
  test("maps suits and majors to Golden Dawn elements", () => {
    expect(cardElement(card("wands_03"))).toBe("fire");
    expect(cardElement(card("cups_11"))).toBe("water");
    expect(cardElement(card("major_04_emperor"))).toBe("fire");
    expect(cardElement(card("major_02_high_priestess"))).toBe("water");
  });

  test("classifies elemental dignities", () => {
    expect(elementDignity("fire", "fire")).toBe("same");
    expect(elementDignity("fire", "air")).toBe("friendly");
    expect(elementDignity("earth", "water")).toBe("friendly");
    expect(elementDignity("fire", "water")).toBe("contrary");
    expect(elementDignity("air", "earth")).toBe("contrary");
    expect(elementDignity("fire", "earth")).toBe("neutral");
  });
});

describe("quintessence", () => {
  test("sums major numbers and minor pips, skipping court cards, reducing below 22", () => {
    expect(quintessence([card("major_09_hermit"), card("cups_03"), card("wands_12")])).toBe(12);
    expect(quintessence([card("major_21_world"), card("major_20_judgement")])).toBe(5);
    expect(quintessence([card("wands_11")])).toBeNull();
  });
});

describe("observeTable", () => {
  test("notices dominant suits, repeated numbers and contrary neighbours", () => {
    const texts = observeTable(lay("three-card", ["cups_03", "cups_05", "swords_03"]), majors).map((item) => item.text);
    expect(texts.some((text) => text.includes("カップ") && text.includes("2枚"))).toBe(true);
    expect(texts.some((text) => text.includes("数字の3が2枚"))).toBe(true);
    expect(texts.some((text) => text.includes("打ち消し合う"))).toBe(false);
    const contrary = observeTable(lay("three-card", ["wands_02", "cups_07", "major_00_fool"]), majors);
    expect(contrary.some((item) => item.text.includes("打ち消し合う"))).toBe(true);
  });

  test("notices missing suits and many majors in larger spreads", () => {
    const ids = ["major_00_fool", "major_13_death", "major_16_tower", "major_18_moon", "wands_02", "wands_05", "swords_14"];
    const observations = observeTable(lay("horseshoe-seven", ids, "reversed"), majors);
    const observed = observations.map((item) => item.id);
    expect(observed).toContain("majors");
    expect(observed).toContain("suit-missing");
    expect(observed).toContain("courts");
    expect(observations.find((item) => item.id === "orientation")?.text).toContain("すべて逆位置");
  });

  test("keeps a single card reading quiet", () => {
    expect(observeTable(lay("one-card", ["major_00_fool"]), majors)).toEqual([]);
  });
});
