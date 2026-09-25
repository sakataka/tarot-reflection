import { describe, expect, test } from "bun:test";
import { completedMessage } from "./codexCli";

describe("Codex CLI events", () => {
  test("accepts only completed agent text", () => {
    expect(completedMessage({ type: "item.completed", item: { type: "agent_message", text: "[[card:1]]\n月です。" } }))
      .toBe("[[card:1]]\n月です。");
    expect(completedMessage({ type: "item.completed", item: { type: "command_execution", text: "secret" } })).toBe("");
    expect(completedMessage({ type: "item.started", item: { type: "agent_message", text: "draft" } })).toBe("");
  });
});
