import { useMemo, useState } from "react";
import type { Reading } from "../types/tarot";
import { generatePrompt } from "../utils/prompt";

type PromptBoxProps = {
  reading: Reading;
};

export const PromptBox = ({ reading }: PromptBoxProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const prompt = useMemo(() => generatePrompt(reading), [reading]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section className="panel prompt-panel">
      <div className="section-heading">
        <div>
          <p className="app-kicker">AI prompt</p>
          <h2>解釈用プロンプト</h2>
        </div>
        <button className="secondary-button" type="button" onClick={copyPrompt}>
          {copyState === "copied" ? "コピー済み" : "プロンプトをコピー"}
        </button>
      </div>
      {copyState === "failed" ? (
        <p className="copy-fallback">コピーに失敗しました。下のテキストを手動で選択してください。</p>
      ) : null}
      <textarea className="prompt-textarea" value={prompt} readOnly rows={18} />
      <div className="future-box">
        将来のAI解釈表示領域です。初期版ではAPIキーをフロントエンドに置かず、プロンプトの手動コピーだけを提供します。
      </div>
    </section>
  );
};
