type BackendCommandArgs = Record<string, unknown>;

export type CodexInterpretationResponse = {
  answer: string;
};

export async function invokeBackend<T = unknown>(command: string, args: BackendCommandArgs = {}): Promise<T> {
  const response = await fetch(`/api/${command}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const responseText = await response.text();
  const payload = parseJson(responseText);

  if (!response.ok) {
    throw new Error(extractBackendError(payload) || buildBackendError(response.status, responseText));
  }

  return payload as T;
}

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
