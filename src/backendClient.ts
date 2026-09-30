import { readStoredEngine } from "./utils/engine";

type BackendCommandArgs = Record<string, unknown>;

function parseJson(responseText: string): unknown {
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function extractBackendError(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    return typeof error === "string" ? error : "";
  }

  return "";
}

function buildBackendError(status: number, responseText: string) {
  if (status === 404 && /not found/i.test(responseText)) {
    return [
      "占い師を呼ぶAPIが見つかりません。",
      "`localweb dev tarot-reflection` で起動した http://tarot-reflection-dev.localhost/ か、LocalWeb の http://tarot-reflection.localhost/ から開いてください。",
      "Vite だけを起動した画面や別アプリの port を開いている場合は、このエラーになります。",
    ].join("\n");
  }

  return responseText.trim() || `API request failed: ${status}`;
}

type StreamEvent = { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string } | { type: "wait" };

// 占い師の語りを届いた分から受け取る。onDelta は差分ごとに呼ばれ、最後まで届くと resolve する。
export async function streamBackend(
  command: string,
  args: BackendCommandArgs,
  { onDelta, signal }: { onDelta: (text: string) => void; signal?: AbortSignal },
): Promise<void> {
  const response = await fetch(`api/${command}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // 占い師の言葉を紡ぐAIは、相談者が選んだものを毎回添える。
    body: JSON.stringify({ ...args, engine: readStoredEngine() }),
    signal,
  });

  if (!response.ok || !response.body) {
    const responseText = await response.text();
    throw new Error(extractBackendError(parseJson(responseText)) || buildBackendError(response.status, responseText));
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    let lineEnd = buffer.indexOf("\n");
    while (lineEnd >= 0) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      lineEnd = buffer.indexOf("\n");
      if (!line) continue;

      const event = parseJson(line) as StreamEvent | null;
      if (event?.type === "delta") onDelta(event.text);
      else if (event?.type === "error") throw new Error(event.message);
      else if (event?.type === "done") return;
    }
  }

  throw new Error("占い師の言葉が途中で途切れました。");
}

export async function requestBackend<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`api/${path}`, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(extractBackendError(parseJson(responseText)) || buildBackendError(response.status, responseText));
  }
  return parseJson(responseText) as T;
}
