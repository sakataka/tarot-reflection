import { existsSync } from "node:fs";
import { tmpdir } from "node:os";

const CODEX_MODEL = "gpt-6-sol";
const CODEX_EFFORT = "medium";

type AskOptions = {
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
};

// --json は完成した agent_message を一件ずつ返す。占いの本文以外のイベントは表示しない。
export function completedMessage(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const record = event as { type?: unknown; item?: { type?: unknown; text?: unknown } };
  return record.type === "item.completed" && record.item?.type === "agent_message" && typeof record.item.text === "string"
    ? record.item.text
    : "";
}

export async function askCodex(prompt: string, { onDelta, signal }: AskOptions = {}): Promise<string> {
  if (!prompt.trim()) throw new Error("Codexに渡す質問文が空です。");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { OPENAI_API_KEY: _openaiApiKey, CODEX_API_KEY: _codexApiKey, ...env } = process.env;
  const child = Bun.spawn([
    findCodexExecutable(), "exec", "--ephemeral", "--json", "--sandbox", "read-only",
    "--skip-git-repo-check", "--cd", tmpdir(), "--model", CODEX_MODEL,
    "-c", `model_reasoning_effort="${CODEX_EFFORT}"`,
    "-c", 'forced_login_method="chatgpt"',
    "-",
  ], { stdin: "pipe", stdout: "pipe", stderr: "pipe", env });

  if (!child.stdin || !child.stdout || !child.stderr) {
    child.kill();
    throw new Error("Codex CLIの標準入出力を開けませんでした。");
  }

  const stopChild = () => child.kill();
  signal?.addEventListener("abort", stopChild, { once: true });
  const stderrPromise = new Response(child.stderr).text();
  let answer = "";
  let buffer = "";
  const decoder = new TextDecoder();

  try {
    await child.stdin.write(new TextEncoder().encode(prompt));
    await child.stdin.end();
    for await (const chunk of child.stdout as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          const text = completedMessage(JSON.parse(line));
          if (text) {
            answer += text;
            onDelta?.(text);
          }
        }
        newline = buffer.indexOf("\n");
      }
    }

    const exitCode = await child.exited;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (exitCode !== 0 || !answer.trim()) {
      const stderr = (await stderrPromise).trim();
      throw new Error(stderr || "Codexから回答を取得できませんでした。");
    }
    return answer.trim();
  } finally {
    child.kill();
    await child.exited.catch(() => undefined);
    signal?.removeEventListener("abort", stopChild);
  }
}

function findCodexExecutable() {
  const pathCandidates = (process.env.PATH ?? "")
    .split(":")
    .filter(Boolean)
    .map((directory) => `${directory}/codex`);
  const candidates = [...pathCandidates, "/opt/homebrew/bin/codex", "/usr/local/bin/codex"];
  return candidates.find((candidate) => existsSync(candidate)) ?? "codex";
}
