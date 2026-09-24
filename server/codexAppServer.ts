import { existsSync } from "node:fs";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type TurnOutput = {
  text: string;
};

class LineReader {
  private readonly decoder = new TextDecoder();
  private readonly iterator: AsyncIterator<Uint8Array>;
  private buffer = "";

  constructor(stream: ReadableStream<Uint8Array>) {
    this.iterator = (stream as unknown as AsyncIterable<Uint8Array>)[Symbol.asyncIterator]();
  }

  async readJsonLine(): Promise<Record<string, unknown>> {
    while (true) {
      const lineEnd = this.buffer.indexOf("\n");
      if (lineEnd >= 0) {
        const line = this.buffer.slice(0, lineEnd).trim();
        this.buffer = this.buffer.slice(lineEnd + 1);
        if (!line) {
          continue;
        }
        return JSON.parse(line) as Record<string, unknown>;
      }

      const { done, value } = await this.iterator.next();
      if (done) {
        throw new Error("Codex App Serverが応答を返す前に終了しました。");
      }
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }
}

const CODEX_MODEL = "gpt-6-sol";
const CODEX_EFFORT = "medium";
const encoder = new TextEncoder();

type AskOptions = {
  // 占い師の語りを、届いた分から順に画面へ流すための受け口。
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
};

export async function askCodexAppServer(prompt: string, { onDelta, signal }: AskOptions = {}): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Codexに渡す質問文が空です。");
  }

  const child = Bun.spawn([findCodexExecutable(), "app-server"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (!child.stdin || !child.stdout || !child.stderr) {
    child.kill();
    throw new Error("Codex App Serverの標準入出力を開けませんでした。");
  }

  // 画面を閉じた・別の問いへ移ったときは、途中でも子プロセスを止める。
  const stopChild = () => child.kill();
  signal?.addEventListener("abort", stopChild, { once: true });

  const stderrPromise = readStderr(child.stderr);
  const writer = child.stdin;
  const reader = new LineReader(child.stdout);

  try {
    await send(writer, {
      method: "initialize",
      id: 0,
      params: {
        clientInfo: {
          name: "tarot_reflection_local",
          title: "Tarot Reflection",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: true,
        },
      },
    });
    await send(writer, { method: "initialized", params: {} });
    await send(writer, { method: "thread/start", id: 1, params: { model: CODEX_MODEL } });

    const threadId = await waitForThreadId(reader);
    const firstTurn = await runTurn(reader, writer, 2, threadId, prompt, onDelta);
    await writer.end();

    child.kill();
    await child.exited.catch(() => undefined);

    if (!firstTurn.text.trim()) {
      const stderrText = await stderrPromise;
      throw new Error(
        stderrText.trim()
          ? `Codexから回答を取得できませんでした。\n\nCodex stderr:\n${stderrText.trim()}`
          : "Codexから回答を取得できませんでした。",
      );
    }

    return firstTurn.text;
  } catch (error) {
    child.kill();
    await child.exited.catch(() => undefined);
    throw error;
  } finally {
    signal?.removeEventListener("abort", stopChild);
  }
}

async function waitForThreadId(reader: LineReader): Promise<string> {
  while (true) {
    const message = await reader.readJsonLine();
    throwIfCodexError(message);

    if (message.id !== 1) {
      continue;
    }

    const threadId = getPointer(message, ["result", "thread", "id"]);
    if (typeof threadId !== "string" || !threadId) {
      throw new Error("Codex App Serverからthread idを取得できませんでした。");
    }

    return threadId;
  }
}

async function runTurn(
  reader: LineReader,
  writer: Bun.FileSink,
  requestId: number,
  threadId: string,
  prompt: string,
  onDelta?: (text: string) => void,
): Promise<TurnOutput> {
  await send(writer, {
    method: "turn/start",
    id: requestId,
    params: {
      threadId,
      model: CODEX_MODEL,
      effort: CODEX_EFFORT,
      input: [{ type: "text", text: prompt }],
    },
  });

  let deltaAnswer = "";
  let completedAnswer = "";

  while (true) {
    const message = await reader.readJsonLine();
    throwIfCodexError(message);

    const method = typeof message.method === "string" ? message.method : "";
    if (method === "item/agentMessage/delta") {
      const delta = extractDelta(message);
      deltaAnswer += delta;
      if (delta) onDelta?.(delta);
    } else if (method === "item/completed" && !deltaAnswer) {
      completedAnswer += extractCompletedAgentMessage(message);
    } else if (method === "turn/completed") {
      // 差分が一度も届かなかった場合だけ、完成した本文をまとめて流す。
      if (!deltaAnswer && completedAnswer) onDelta?.(completedAnswer);
      break;
    }
  }

  return {
    text: (deltaAnswer || completedAnswer).trim(),
  };
}

async function send(writer: Bun.FileSink, message: JsonValue) {
  await writer.write(encoder.encode(`${JSON.stringify(message)}\n`));
  await writer.flush();
}

async function readStderr(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let output = "";

  while (output.length < 4000) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    output += decoder.decode(value);
  }

  return output;
}

function throwIfCodexError(message: Record<string, unknown>) {
  const error = message.error;
  if (error && typeof error === "object" && "message" in error) {
    const messageText = (error as { message?: unknown }).message;
    throw new Error(typeof messageText === "string" ? messageText : "Codex App Serverでエラーが発生しました。");
  }
}

function extractDelta(message: Record<string, unknown>) {
  for (const path of [
    ["params", "delta"],
    ["params", "textDelta"],
    ["params", "contentDelta"],
    ["params", "text"],
  ]) {
    const value = getPointer(message, path);
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function extractCompletedAgentMessage(message: Record<string, unknown>) {
  const item = getPointer(message, ["params", "item"]);
  if (!item || typeof item !== "object" || (item as { type?: unknown }).type !== "agent_message") {
    return "";
  }

  for (const path of [["text"], ["message"], ["content", "0", "text"]]) {
    const value = getPointer(item as Record<string, unknown>, path);
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function getPointer(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function findCodexExecutable() {
  const pathCandidates = (process.env.PATH ?? "")
    .split(":")
    .filter(Boolean)
    .map((directory) => `${directory}/codex`);
  const candidates = [...pathCandidates, "/opt/homebrew/bin/codex", "/usr/local/bin/codex"];

  return candidates.find((candidate) => existsSync(candidate)) ?? "codex";
}
