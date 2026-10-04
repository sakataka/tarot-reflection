import { mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Exchange } from "../src/types/tarot";
import { maxReplyLength } from "../src/utils/limits";
import type { ReadingRecord } from "../src/utils/history";
import { maxFollowUps, toCardRecord } from "../src/utils/history";
import { parseReadingInput } from "./interpretationRequest";
import { tarotDeck } from "../src/data/tarotDeck";
import { randomInt, randomOrientation } from "../src/utils/random";

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
  prepareFollowUp: (id: string, question: string, drawClarifier: boolean) => Promise<ReadingRecord>;
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
    prepareFollowUp: (id, question, drawClarifier) => serialize(async () => {
      question = question.trim();
      if (!question || question.length > maxReplyLength) throw new Error("Invalid follow-up question.");
      const records = await read();
      const record = records.find((item) => item.id === id);
      if (!record) throw new Error("Reading not found.");
      // 最後の答えが保存済みなら、切れた通信を回復する。次の札を予約しない。
      if (!record.pendingFollowUp && record.followUps?.at(-1)?.question === question) return record;
      if ((record.followUps?.length ?? 0) >= maxFollowUps) throw new Error("No more questions tonight.");
      // 同じ未回答の席は再試行する。別の問いで確定済みの札を読み替えない。
      if (record.pendingFollowUp) {
        if (record.pendingFollowUp.question !== question) throw new Error("先ほどの聞き返しをもう一度送ってください。");
        return record;
      } else {
        const used = new Set([
          ...record.cards.map((card) => card.cardId), record.jumper?.cardId, record.root?.cardId,
          ...(record.followUps ?? []).map((exchange) => exchange.clarifier?.cardId),
        ]);
        const remaining = tarotDeck.filter((card) => !used.has(card.id));
        if (drawClarifier && !remaining.length) throw new Error("No cards remain.");
        record.pendingFollowUp = {
          question,
          clarifier: drawClarifier ? { cardId: remaining[randomInt(remaining.length)].id, orientation: randomOrientation() } : null,
        };
      }
      // 語りを始める前に保存する。失敗したらカードを表に出さない。
      await write(records);
      return record;
    }),
    addFollowUp: (id, input) =>
      serialize(async () => {
        const body = (input && typeof input === "object" ? input : {}) as { question?: unknown; answer?: unknown; clarifier?: unknown };
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
        const proposed = body.clarifier as { cardId?: unknown; orientation?: unknown } | null | undefined;
        if (body.clarifier != null && (!proposed || typeof proposed.cardId !== "string" || !["upright", "reversed"].includes(String(proposed.orientation)))) {
          throw new Error("Invalid clarifier.");
        }
        if (proposed) exchange.clarifier = { cardId: proposed.cardId as string, orientation: proposed.orientation as "upright" | "reversed" };
        const sameCard = (a: Exchange["clarifier"] | null | undefined, b: Exchange["clarifier"] | null | undefined) =>
          (a?.cardId ?? null) === (b?.cardId ?? null) && (a?.orientation ?? null) === (b?.orientation ?? null);
        // 応答が届かなかった保存の再試行でも、同じやりとりを二度追加しない。
        if (record.followUps?.some((item) => item.question === exchange.question && item.answer === exchange.answer && sameCard(item.clarifier, exchange.clarifier))) return true;
        if ((record.followUps?.length ?? 0) >= maxFollowUps) throw new Error("No more questions tonight.");
        const reserved = record.pendingFollowUp;
        if (reserved ? reserved.question !== exchange.question || !sameCard(reserved.clarifier, exchange.clarifier) : Boolean(exchange.clarifier)) {
          throw new Error("Follow-up does not match the reserved card.");
        }
        record.followUps = [...(record.followUps ?? []), exchange];
        delete record.pendingFollowUp;
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
