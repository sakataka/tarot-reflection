import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
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
});
