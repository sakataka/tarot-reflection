import { relative, resolve, sep } from "node:path";
import { askCodexAppServer } from "./codexAppServer";
import { buildPromptFromInterpretationInput } from "./interpretationRequest";

const port = Number(process.env.PORT ?? 4192);
const distDir = resolve(import.meta.dir, "..", "dist");

type ApiPayload = Record<string, unknown>;

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/interpret") {
      return handleApi(request, async () => {
        const body = await request.json().catch(() => null);
        const prompt = buildPromptFromInterpretationInput(body);
        const answer = await askCodexAppServer(prompt);
        return { answer };
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Unknown API endpoint." }, 404);
    }

    return serveStatic(url.pathname);
  },
});

console.log(`Tarot Reflection local server listening on http://127.0.0.1:${port}/`);

async function handleApi(request: Request, handler: () => Promise<ApiPayload>) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    return jsonResponse(await handler());
  } catch (error) {
    const message = error instanceof Error ? error.message : "API request failed.";
    return jsonResponse({ error: message }, 500);
  }
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
