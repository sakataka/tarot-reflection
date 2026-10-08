import { relative, resolve, sep } from "node:path";
import { parseEngine, type EngineId } from "../src/utils/engine";
import { generateClarifyPrompt } from "../src/utils/prompt";
import { maxQuestionLength } from "../src/utils/limits";
import { buildFollowUpRequest, buildPromptFromInterpretationInput } from "./interpretationRequest";
import { askOracle } from "./oracleEngine";
import { createReadingStore } from "./readingStore";
import { createWhisper, whisperAvailable, WhisperError } from "./whisper";
import { readingFromRecord, tablePayload } from "../src/utils/history";

// LocalWeb passes PORT (localweb dev / LaunchAgent). There is no fallback, so a standalone run never takes another app's port.
const port = Number(process.env.PORT);
if (!(port >= 0)) { console.error("PORT is required. Start it with `localweb dev tarot-reflection`."); process.exit(1); }
const distDir = resolve(import.meta.dir, "..", "dist");

type ApiPayload = Record<string, unknown>;

const store = createReadingStore();
// 占い師が覚えている範囲。古すぎる話や、たくさんの話は持ち出さない。
const memoryDays = 45;
const memoryCount = 3;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/interpret/stream") {
      return handleInterpretStream(request);
    }

    if (url.pathname === "/api/clarify/stream") {
      return handleClarifyStream(request);
    }

    if (url.pathname === "/api/follow-up/stream") {
      return handleFollowUpStream(request);
    }

    if (url.pathname === "/api/whisper") {
      return handleWhisper(request);
    }

    if (url.pathname === "/api/readings") {
      return handleReadings(request);
    }

    const prepareMatch = url.pathname.match(/^\/api\/readings\/([\w-]+)\/follow-up$/);
    if (prepareMatch && request.method === "POST") {
      try {
        const body = await request.json() as { ask?: unknown; drawClarifier?: unknown };
        const record = await store.prepareFollowUp(prepareMatch[1], typeof body.ask === "string" ? body.ask : "", body.drawClarifier === true);
        return jsonResponse({ previous: record.followUps ?? [], clarifier: record.pendingFollowUp?.clarifier ?? null, completed: !record.pendingFollowUp });
      } catch (error) {
        return jsonResponse({ error: error instanceof Error ? error.message : "補足の一枚を準備できませんでした。" }, 400);
      }
    }

    const followUpMatch = url.pathname.match(/^\/api\/readings\/([\w-]+)\/follow-ups$/);
    if (followUpMatch && request.method === "POST") {
      try {
        const exchange: unknown = await request.json().catch(() => null);
        return (await store.addFollowUp(followUpMatch[1], exchange))
          ? jsonResponse({ ok: true })
          : jsonResponse({ error: "Reading not found." }, 404);
      } catch {
        return jsonResponse({ error: "聞き返しの記録を残せませんでした。もう一度保存してください。" }, 500);
      }
    }

    const readingMatch = url.pathname.match(/^\/api\/readings\/([\w-]+)$/);
    if (readingMatch && request.method === "DELETE") {
      return (await store.remove(readingMatch[1]))
        ? jsonResponse({ ok: true })
        : jsonResponse({ error: "Reading not found." }, 404);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Unknown API endpoint." }, 404);
    }

    return serveStatic(url.pathname);
  },
});

console.log(`Tarot Reflection local server listening on http://127.0.0.1:${server.port}/`);

async function handleInterpretStream(request: Request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  let prompt: string;
  let engine: EngineId;
  try {
    const since = Date.now() - memoryDays * 86_400_000;
    const pastReadings = (await store.list().catch(() => []))
      .filter((record) => Date.parse(record.createdAt) >= since)
      .slice(0, memoryCount);
    const body = await request.json().catch(() => null);
    engine = engineOf(body);
    prompt = buildPromptFromInterpretationInput(body, pastReadings);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }
  return streamOracle(request, engine, prompt);
}

// カードを引く前に、占い師が一つだけ問い返す。短いので速さを優先する。
async function handleClarifyStream(request: Request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, maxQuestionLength) : "";
  if (!question) return jsonResponse({ error: "Question is empty." }, 400);
  const firstVisit = (await store.list().catch(() => [])).length === 0;
  return streamOracle(request, engineOf(body), generateClarifyPrompt(question, { firstVisit }), { effort: "low" });
}

// 読み終えたあとの聞き返し。保存に失敗しても答えを返し、画面側で保存だけをやり直せる。
async function handleFollowUpStream(request: Request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  let followUp: ReturnType<typeof buildFollowUpRequest>;
  let engine: EngineId;
  let clarifier: import("../src/utils/history").CardRecord | null = null;
  try {
    const rawBody: unknown = await request.json().catch(() => null);
    const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as { recordId?: unknown; ask?: unknown; drawClarifier?: unknown };
    engine = engineOf(rawBody);
    const record = await store.prepareFollowUp(typeof body.recordId === "string" ? body.recordId : "", typeof body.ask === "string" ? body.ask : "", body.drawClarifier === true);
    if (!record.pendingFollowUp) {
      const answer = record.followUps?.at(-1)?.answer ?? "";
      return new Response(`${JSON.stringify({ type: "delta", text: answer })}\n${JSON.stringify({ type: "done" })}\n`, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const reading = readingFromRecord(record);
    if (!reading) throw new Error("Reading cannot be restored.");
    clarifier = record.pendingFollowUp?.clarifier ?? null;
    followUp = buildFollowUpRequest({ ...tablePayload(reading), narration: record.narration, previous: record.followUps ?? [], ask: record.pendingFollowUp?.question, recordId: record.id, clarifier });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }
  return streamOracle(request, engine, followUp.prompt, {
    onComplete: async (answer) => {
      if (followUp.recordId) await store.addFollowUp(followUp.recordId, { question: followUp.ask, answer, ...(clarifier ? { clarifier } : {}) }).catch(() => false);
    },
  });
}

const engineOf = (body: unknown) => parseEngine((body as { engine?: unknown } | null)?.engine);

// 占い師の言葉を NDJSON で一行ずつ返す。{type:"delta"} を重ね、最後に done か error が届く。
function streamOracle(
  request: Request,
  engine: EngineId,
  prompt: string,
  { effort, onComplete }: { effort?: "low" | "medium"; onComplete?: (answer: string) => Promise<unknown> } = {},
) {
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ApiPayload) => {
        if (abort.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      // 考え込んでいるあいだも接続が切られないよう、ときどき合図を送る。
      const heartbeat = setInterval(() => emit({ type: "wait" }), 5000);

      try {
        const answer = await askOracle(engine, prompt, {
          signal: abort.signal,
          effort,
          onDelta: (text) => emit({ type: "delta", text }),
        });
        await onComplete?.(answer);
        emit({ type: "done" });
      } catch (error) {
        emit({ type: "error", message: error instanceof Error ? error.message : "API request failed." });
      } finally {
        clearInterval(heartbeat);
        if (!abort.signal.aborted) controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// 「今夜の答え」の囁き。GET で声の準備があるかを返し、POST で音声（MP3）を返す。
async function handleWhisper(request: Request) {
  if (request.method === "GET") return jsonResponse({ available: whisperAvailable() });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  try {
    const audio = await createWhisper(typeof body?.text === "string" ? body.text : "", request.signal);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "声を作れませんでした。" }, error instanceof WhisperError ? error.status : 502);
  }
}

async function handleReadings(request: Request) {
  if (request.method === "GET") {
    return jsonResponse({ readings: await store.list() });
  }
  if (request.method === "POST") {
    try {
      return jsonResponse({ reading: await store.add(await request.json().catch(() => null)) });
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
    }
  }
  return jsonResponse({ error: "Method not allowed." }, 405);
}

function jsonResponse(payload: ApiPayload, status = 200) {
  return Response.json(payload, { status });
}

async function serveStatic(pathname: string) {
  const requestPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = resolve(distDir, requestPath);
  const relativePath = relative(distDir, filePath);

  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`) || relativePath === "..") {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }

  const indexFile = Bun.file(resolve(distDir, "index.html"));
  if (await indexFile.exists()) {
    return new Response(indexFile);
  }

  return new Response("Build output not found. Run `bun run build` before `bun run server`.", { status: 404 });
}
