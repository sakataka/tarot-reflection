import { existsSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { AskOptions } from "./oracleEngine";

// Claude Code CLI の古い版は新しいモデルを知らない。見つけた中でいちばん新しい CLI を使う。
const CLAUDE_MODEL = process.env.TAROT_CLAUDE_MODEL ?? "claude-opus-5-5";

// 占い師として話すだけなので、コーディング用の既定のシステムプロンプトは差し替える。
const systemPrompt = "あなたは夜の占い部屋で相談者に語りかける占い師です。依頼文に書かれた人物になりきり、相談者に見せる日本語の本文だけを返します。";

// stream-json の一行から、語りの差分だけを取り出す。考えている途中の文やツールの出来事は見せない。
export function textDelta(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const record = event as { type?: unknown; event?: { type?: unknown; delta?: { type?: unknown; text?: unknown } } };
  const delta = record.type === "stream_event" && record.event?.type === "content_block_delta" ? record.event.delta : undefined;
  return delta?.type === "text_delta" && typeof delta.text === "string" ? delta.text : "";
}

// 最後の result に失敗が書かれていれば、その文面を返す。
export function resultError(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const record = event as { type?: unknown; is_error?: unknown; result?: unknown };
  if (record.type !== "result" || record.is_error !== true) return "";
  return typeof record.result === "string" && record.result.trim() ? record.result.trim() : "Claudeから回答を取得できませんでした。";
}

export async function askClaude(prompt: string, { onDelta, signal, effort = "medium" }: AskOptions = {}): Promise<string> {
  if (!prompt.trim()) throw new Error("Claudeに渡す質問文が空です。");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // APIキーがあっても使わず、Claude Code にログインしたサブスクリプションで呼ぶ。
  const { ANTHROPIC_API_KEY: _anthropicApiKey, ...env } = process.env;
  // --safe-mode で CLAUDE.md・hooks・MCP などの個人設定を読まず、--tools "" で道具を持たせない。
  const child = Bun.spawn([
    findClaudeExecutable(), "-p", "--safe-mode",
    "--model", CLAUDE_MODEL, "--effort", effort,
    "--output-format", "stream-json", "--verbose", "--include-partial-messages",
    "--no-session-persistence", "--tools", "", "--strict-mcp-config", "--disable-slash-commands",
    "--system-prompt", systemPrompt,
  ], { stdin: "pipe", stdout: "pipe", stderr: "pipe", env, cwd: tmpdir() });

  if (!child.stdin || !child.stdout || !child.stderr) {
    child.kill();
    throw new Error("Claude CLIの標準入出力を開けませんでした。");
  }

  const stopChild = () => child.kill();
  signal?.addEventListener("abort", stopChild, { once: true });
  const stderrPromise = new Response(child.stderr).text();
  let answer = "";
  let failure = "";
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
          const event = JSON.parse(line);
          const text = textDelta(event);
          if (text) {
            answer += text;
            onDelta?.(text);
          }
          failure ||= resultError(event);
        }
        newline = buffer.indexOf("\n");
      }
    }

    const exitCode = await child.exited;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (failure) throw new Error(failure);
    if (exitCode !== 0 || !answer.trim()) {
      const stderr = (await stderrPromise).trim();
      throw new Error(stderr || "Claudeから回答を取得できませんでした。");
    }
    return answer.trim();
  } finally {
    child.kill();
    await child.exited.catch(() => undefined);
    signal?.removeEventListener("abort", stopChild);
  }
}

// Claude デスクトップアプリが同梱する CLI は自動で更新され、Homebrew 版より新しいことが多い。
// TAROT_CLAUDE_BIN があればそれを使い、なければ同梱版の最新、最後に PATH 上の claude を探す。
function findClaudeExecutable() {
  if (process.env.TAROT_CLAUDE_BIN) return process.env.TAROT_CLAUDE_BIN;
  const bundled = newestBundledClaude(join(homedir(), "Library", "Application Support", "Claude", "claude-code"));
  if (bundled) return bundled;
  const pathCandidates = (process.env.PATH ?? "")
    .split(":")
    .filter(Boolean)
    .map((directory) => `${directory}/claude`);
  const candidates = [...pathCandidates, "/opt/homebrew/bin/claude", "/usr/local/bin/claude", join(homedir(), ".local", "bin", "claude")];
  return candidates.find((candidate) => existsSync(candidate)) ?? "claude";
}

export function newestBundledClaude(root: string): string | null {
  let versions: string[];
  try {
    versions = readdirSync(root).filter((name) => /^\d+(\.\d+)*$/.test(name));
  } catch {
    return null;
  }
  const newestFirst = versions.sort((a, b) => compareVersions(b, a));
  for (const version of newestFirst) {
    const binary = join(root, version, "claude.app", "Contents", "MacOS", "claude");
    if (existsSync(binary)) return binary;
  }
  return null;
}

export const compareVersions = (a: string, b: string) => {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff) return diff;
  }
  return 0;
};
