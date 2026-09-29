import type { EngineId } from "../src/utils/engine";
import { askClaude } from "./claudeCli";
import { askCodex } from "./codexCli";

export type AskOptions = {
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
  // 短い問い返しは速さを優先して low にする。
  effort?: "low" | "medium";
};

// 選ばれたAIのCLIを呼ぶ。どちらもログイン済みのサブスクリプションを使い、APIキーは使わない。
export const askOracle = (engine: EngineId, prompt: string, options: AskOptions = {}) =>
  engine === "codex" ? askCodex(prompt, options) : askClaude(prompt, options);
