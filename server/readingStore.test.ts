import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReadingStore } from "./readingStore";

const directory = mkdtempSync(join(tmpdir(), "tarot-store-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

const input = {
  question: "今夜の問い",
  spreadId: "one-card",
  cards: [{ cardId: "major_00_fool", orientation: "upright" }],
  jumper: { cardId: "cups_02", orientation: "reversed" },
  root: { cardId: "wands_05", orientation: "upright" },
  narration: "[[card:1]]\n愚者です。\n[[close]]\nおやすみなさい。",
  createdAt: "2026-09-27T12:00:00.000Z",
};

describe("readingStore", () => {
  test("saves, lists newest first, ignores duplicates and removes records", async () => {
    const store = createReadingStore(join(directory, "readings.json"));
    const first = await store.add(input);
    expect(first.jumper?.cardId).toBe("cups_02");
    expect((await store.add(input)).id).toBe(first.id);

    const second = await store.add({ ...input, createdAt: "2026-09-27T13:00:00.000Z" });
    expect((await store.list()).map((record) => record.id)).toEqual([second.id, first.id]);

    expect(await store.addFollowUp(second.id, { question: "もう少し", answer: "ええ" })).toBe(true);
    expect(await store.addFollowUp("missing", { question: "x", answer: "y" })).toBe(false);
    expect((await store.list())[0].followUps).toEqual([{ question: "もう少し", answer: "ええ" }]);

    expect(await store.remove(first.id)).toBe(true);
    expect(await store.remove(first.id)).toBe(false);
    expect(await store.list()).toHaveLength(1);
  });

  test("rejects duplicated cards and empty narration", async () => {
    const store = createReadingStore(join(directory, "other.json"));
    await expect(store.add({ ...input, root: { cardId: "major_00_fool", orientation: "upright" } })).rejects.toThrow("twice");
    await expect(store.add({ ...input, narration: " " })).rejects.toThrow("empty");
  });

  test("does not overwrite an unreadable archive when adding a reading", async () => {
    for (const [index, contents] of ['[{"id":"broken"', '{"readings":[]}'].entries()) {
      const path = join(directory, `broken-${index}.json`);
      writeFileSync(path, contents);
      const store = createReadingStore(path);
      await expect(store.list()).rejects.toThrow();
      await expect(store.add(input)).rejects.toThrow();
      expect(readFileSync(path, "utf8")).toBe(contents);
    }
  });

  test("retries follow-up saves without duplicates and allows only two exchanges", async () => {
    const store = createReadingStore(join(directory, "follow-ups.json"));
    const record = await store.add(input);
    const exchange = { question: "もう少し", answer: "ええ" };
    await Promise.all([store.addFollowUp(record.id, exchange), store.addFollowUp(record.id, exchange)]);
    expect((await store.list())[0].followUps).toEqual([exchange]);
    await store.addFollowUp(record.id, { question: "最後に", answer: "はい" });
    expect(await store.addFollowUp(record.id, exchange)).toBe(true);
    await expect(store.addFollowUp(record.id, { question: "三度目", answer: "いいえ" })).rejects.toThrow("No more");
    expect((await store.list())[0].followUps).toHaveLength(2);
  });

  test("preserves long follow-up answers and rejects invalid exchanges", async () => {
    const store = createReadingStore(join(directory, "long-follow-up.json"));
    const record = await store.add(input);
    const exchange = { question: "もう少し", answer: "あ".repeat(1500) };
    await store.addFollowUp(record.id, exchange);
    expect((await store.list())[0].followUps).toEqual([exchange]);
    await expect(store.addFollowUp(record.id, null)).rejects.toThrow("empty");
    await expect(store.addFollowUp(record.id, { question: "x".repeat(601), answer: "y" })).rejects.toThrow("long");
    expect((await store.list())[0].followUps).toHaveLength(1);
  });
});
