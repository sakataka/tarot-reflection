import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareVersions, newestBundledClaude, resultError, textDelta } from "./claudeCli";

describe("Claude CLI events", () => {
  test("accepts only streamed answer text", () => {
    expect(textDelta({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "[[card:1]]" } } }))
      .toBe("[[card:1]]");
    expect(textDelta({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "考え中" } } })).toBe("");
    expect(textDelta({ type: "assistant", message: { content: [{ type: "text", text: "全文" }] } })).toBe("");
  });

  test("reports the failure written in the final result", () => {
    expect(resultError({ type: "result", is_error: true, result: "API Error: 400 version 2.1.280 or newer is required." }))
      .toBe("API Error: 400 version 2.1.280 or newer is required.");
    expect(resultError({ type: "result", is_error: false, result: "語り" })).toBe("");
  });

  test("orders CLI versions numerically", () => {
    expect(["2.1.99", "2.1.284", "2.1.281"].sort((a, b) => compareVersions(b, a))).toEqual(["2.1.284", "2.1.281", "2.1.99"]);
  });

  test("finds the newest bundled CLI in both the old and the build-id layouts", () => {
    const root = mkdtempSync(join(tmpdir(), "tarot-claude-"));
    const place = (...parts: string[]) => {
      const directory = join(root, ...parts, "claude.app", "Contents", "MacOS");
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "claude"), "");
      return join(directory, "claude");
    };
    try {
      place("2.1.99");
      expect(newestBundledClaude(root)).toBe(join(root, "2.1.99", "claude.app", "Contents", "MacOS", "claude"));
      const newest = place("2.1.286", "f2326db61802");
      place("2.1.284", "4819fdb9b264");
      expect(newestBundledClaude(root)).toBe(newest);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
