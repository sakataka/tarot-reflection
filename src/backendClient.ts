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
      "Codex連携APIが見つかりません。",
      "`bun run dev` で起動した http://127.0.0.1:4192/ から開いてください。",
      "古い http://127.0.0.1:5173/ や別アプリの4174番を開いている場合は、このエラーになります。",
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
  const response = await fetch(`/api/${command}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
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
