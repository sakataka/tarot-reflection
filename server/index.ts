import { relative, resolve, sep } from "node:path";
import { askCodex } from "./codexCli";
import { generateClarifyPrompt } from "../src/utils/prompt";
import { buildFollowUpRequest, buildPromptFromInterpretationInput, maxQuestionLength } from "./interpretationRequest";
import { createReadingStore } from "./readingStore";

const port = Number(process.env.PORT ?? 4192);
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

    if (url.pathname === "/api/readings") {
      return handleReadings(request);
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
  try {
    const since = Date.now() - memoryDays * 86_400_000;
    const pastReadings = (await store.list().catch(() => []))
      .filter((record) => Date.parse(record.createdAt) >= since)
      .slice(0, memoryCount);
    prompt = buildPromptFromInterpretationInput(await request.json().catch(() => null), pastReadings);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }
  return streamCodex(request, prompt);
}

// カードを引く前に、占い師が一つだけ問い返す。短いので速さを優先する。
async function handleClarifyStream(request: Request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, maxQuestionLength) : "";
  if (!question) return jsonResponse({ error: "Question is empty." }, 400);
  const firstVisit = (await store.list().catch(() => [])).length === 0;
  return streamCodex(request, generateClarifyPrompt(question, { firstVisit }), { effort: "low" });
}

// 読み終えたあとの聞き返し。答え終えたら記録に書き足す。
async function handleFollowUpStream(request: Request) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  let followUp: ReturnType<typeof buildFollowUpRequest>;
  try {
    followUp = buildFollowUpRequest(await request.json().catch(() => null));
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }
  return streamCodex(request, followUp.prompt, {
    onComplete: async (answer) => {
      if (followUp.recordId) await store.addFollowUp(followUp.recordId, { question: followUp.ask, answer }).catch(() => false);
    },
  });
}

// 占い師の言葉を NDJSON で一行ずつ返す。{type:"delta"} を重ね、最後に done か error が届く。
function streamCodex(
  request: Request,
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
        const answer = await askCodex(prompt, {
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
