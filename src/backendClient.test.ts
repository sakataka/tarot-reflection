import { afterEach, describe, expect, test } from "bun:test";
import { streamBackend } from "./backendClient";
import { storeEngine, type EngineId } from "./utils/engine";

const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
  storeEngine("claude");
});

describe("engine selection in backend requests", () => {
  for (const unavailable of ["writes", "all access"] as const) {
    test(`uses the selected engine when storage rejects ${unavailable}`, async () => {
      const storage = {
        getItem: () => "claude",
        setItem: () => { throw new Error("Storage denied"); },
      };
      Object.defineProperty(globalThis, "localStorage", unavailable === "writes"
        ? { configurable: true, value: storage }
        : { configurable: true, get: () => { throw new Error("Storage denied"); } });
      const sentEngines: EngineId[] = [];
      globalThis.fetch = (async (_input, init) => {
        sentEngines.push(JSON.parse(String(init?.body)).engine);
        return new Response('{"type":"done"}\n');
      }) as typeof fetch;

      // 問い返し・読み解き・聞き返しのすべてで、同じ選択を使う。
      storeEngine("codex");
      for (const command of ["clarify/stream", "interpret/stream", "follow-up/stream"]) {
        await streamBackend(command, {}, { onDelta: () => undefined });
      }
      storeEngine("claude");
      await streamBackend("clarify/stream", {}, { onDelta: () => undefined });
      expect(sentEngines).toEqual(["codex", "codex", "codex", "claude"]);
    });
  }
});
