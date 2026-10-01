// 占い師の言葉を紡ぐAI。画面で切り替え、ブラウザに覚えておく。

export const engines = [
  { id: "claude", label: "Claude", model: "Opus 5.5" },
  { id: "codex", label: "Codex", model: "GPT-6.1 Sol" },
] as const;

export type EngineId = (typeof engines)[number]["id"];

export const defaultEngine: EngineId = "claude";

export const parseEngine = (value: unknown): EngineId =>
  engines.some((engine) => engine.id === value) ? (value as EngineId) : defaultEngine;

const storageKey = "tarot-reflection:engine";
// 保存を拒否されても、画面で選んだAIをこのタブのリクエストに使う。
let sessionEngine: EngineId | undefined;

export const readStoredEngine = (): EngineId => {
  if (sessionEngine) return sessionEngine;
  try {
    return parseEngine(globalThis.localStorage?.getItem(storageKey));
  } catch {
    return defaultEngine;
  }
};

export const storeEngine = (engine: EngineId) => {
  sessionEngine = engine;
  try {
    globalThis.localStorage?.setItem(storageKey, engine);
  } catch {
    // 保存できなくても、このタブの中では選んだAIで呼ぶ。
  }
};
