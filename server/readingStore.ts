import { mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Exchange } from "../src/types/tarot";
import { maxReplyLength } from "../src/utils/limits";
import type { ReadingRecord } from "../src/utils/history";
import { maxFollowUps, toCardRecord } from "../src/utils/history";
import { parseReadingInput } from "./interpretationRequest";

// リーディングの記録は、このMacの中にだけ JSON で残す。iPhoneから開いても同じ占い師が覚えている。
const maxRecords = 300;
const maxNarrationLength = 20_000;

export const defaultStorePath = () =>
  join(process.env.TAROT_DATA_DIR ?? join(homedir(), "Library", "Application Support", "tarot-reflection"), "readings.json");

export type ReadingStore = {
  list: () => Promise<ReadingRecord[]>;
  add: (input: unknown) => Promise<ReadingRecord>;
  remove: (id: string) => Promise<boolean>;
  addFollowUp: (id: string, input: unknown) => Promise<boolean>;
};

export const createReadingStore = (path = defaultStorePath()): ReadingStore => {
  // 書き込みは一本の列に並べ、同時に届いても取りこぼさない。
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<ReadingRecord[]> => {
    const file = Bun.file(path);
    if (!(await file.exists())) return [];
    // 壊れた記録を空とみなすと、次の保存で残っていた記録を上書きしてしまう。
    const data: unknown = await file.json();
    if (!Array.isArray(data)) throw new Error("Reading archive is not an array.");
    return data;
  };

  const write = async (records: ReadingRecord[]) => {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await Bun.write(temporary, JSON.stringify(records, null, 2));
    await rename(temporary, path);
  };

  return {
    list: read,
    add: (input) =>
      serialize(async () => {
        const body = (input && typeof input === "object" ? input : {}) as { narration?: unknown; createdAt?: unknown };
        const createdAt = typeof body.createdAt === "string" && !Number.isNaN(Date.parse(body.createdAt))
          ? new Date(body.createdAt).toISOString()
          : new Date().toISOString();
        const reading = parseReadingInput(input, createdAt);
        const narration = typeof body.narration === "string" ? body.narration.slice(0, maxNarrationLength) : "";
        if (!narration.trim()) throw new Error("Narration is empty.");

        const records = await read();
        // 同じ卓を二度残さない（通信のやり直しなど）。
        const existing = records.find((record) => record.createdAt === createdAt && record.question === reading.question);
        if (existing) return existing;

        const record: ReadingRecord = {
          id: crypto.randomUUID(),
          question: reading.question,
          spreadId: reading.spread.id,
          cards: reading.cards.map(toCardRecord),
          jumper: reading.jumper ? toCardRecord(reading.jumper) : null,
          root: reading.root ? toCardRecord(reading.root) : null,
          narration,
          clarification: reading.clarification ?? null,
          followUps: [],
          createdAt,
        };
        await write([record, ...records].slice(0, maxRecords));
        return record;
      }),
    addFollowUp: (id, input) =>
      serialize(async () => {
        const body = (input && typeof input === "object" ? input : {}) as { question?: unknown; answer?: unknown };
        const exchange: Exchange = {
          question: typeof body.question === "string" ? body.question.trim() : "",
          answer: typeof body.answer === "string" ? body.answer.trim() : "",
        };
        if (!exchange.question || !exchange.answer) throw new Error("Exchange is empty.");
        if (exchange.question.length > maxReplyLength || exchange.answer.length > maxNarrationLength) {
          throw new Error("Exchange is too long.");
        }
        const records = await read();
        const record = records.find((item) => item.id === id);
        if (!record) return false;
        // 応答が届かなかった保存の再試行でも、同じやりとりを二度追加しない。
        if (record.followUps?.some((item) => item.question === exchange.question && item.answer === exchange.answer)) return true;
        if ((record.followUps?.length ?? 0) >= maxFollowUps) throw new Error("No more questions tonight.");
        record.followUps = [...(record.followUps ?? []), exchange];
        await write(records);
        return true;
      }),
    remove: (id) =>
      serialize(async () => {
        const records = await read();
        const remaining = records.filter((record) => record.id !== id);
        if (remaining.length === records.length) return false;
        await write(remaining);
        return true;
      }),
  };
};
