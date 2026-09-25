import { relative, resolve, sep } from "node:path";
import { askCodex } from "./codexCli";
import { buildPromptFromInterpretationInput } from "./interpretationRequest";

const port = Number(process.env.PORT ?? 4192);
const distDir = resolve(import.meta.dir, "..", "dist");

type ApiPayload = Record<string, unknown>;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/interpret/stream") {
      return handleInterpretStream(request);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Unknown API endpoint." }, 404);
    }

    return serveStatic(url.pathname);
  },
});

console.log(`Tarot Reflection local server listening on http://127.0.0.1:${server.port}/`);

// 占い師の語りを NDJSON で一行ずつ返す。{type:"delta"} を重ね、最後に done か error が届く。
async function handleInterpretStream(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let prompt: string;
  try {
    prompt = buildPromptFromInterpretationInput(await request.json().catch(() => null));
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 400);
  }

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
        await askCodex(prompt, {
          signal: abort.signal,
          onDelta: (text) => emit({ type: "delta", text }),
        });
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
