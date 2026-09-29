import { describe, expect, test } from "bun:test";
import { compareVersions, resultError, textDelta } from "./claudeCli";

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
});
