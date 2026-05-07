import { useMemo, useState } from "react";
import { invokeBackend, type CodexInterpretationResponse } from "../backendClient";
import type { Reading } from "../types/tarot";
import { generatePrompt } from "../utils/prompt";

type PromptBoxProps = {
  reading: Reading;
};

export const PromptBox = ({ reading }: PromptBoxProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answerCopyState, setAnswerCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isAskingCodex, setIsAskingCodex] = useState(false);
  const prompt = useMemo(() => generatePrompt(reading), [reading]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const askCodex = async () => {
    setIsAskingCodex(true);
    setError("");
    setAnswer("");
    setAnswerCopyState("idle");

    try {
      const response = await invokeBackend<CodexInterpretationResponse>("interpret", { prompt });
      setAnswer(response.answer);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Codexから回答を取得できませんでした。");
    } finally {
      setIsAskingCodex(false);
    }
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setAnswerCopyState("copied");
    } catch {
      setAnswerCopyState("failed");
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

      <div className="codex-request-box">
        <div>
          <h3>Codex App Serverに聞く</h3>
          <p>
            ローカルBunサーバーが `codex app-server` を子プロセスとして起動し、このプロンプトを渡します。
            APIキーはフロントエンドに置きません。
          </p>
        </div>
        <button className="primary-button inline-button" type="button" disabled={isAskingCodex} onClick={askCodex}>
          {isAskingCodex ? "Codexに質問中" : "Codexに聞く"}
        </button>
      </div>

      {error ? <p className="copy-fallback">{error}</p> : null}

      {answer ? (
        <div className="answer-box">
          <div className="section-heading compact-heading">
            <div>
              <p className="app-kicker">Codex answer</p>
              <h2>AI解釈</h2>
            </div>
            <button className="secondary-button" type="button" onClick={copyAnswer}>
              {answerCopyState === "copied" ? "コピー済み" : "回答をコピー"}
            </button>
          </div>
          {answerCopyState === "failed" ? (
            <p className="copy-fallback">回答のコピーに失敗しました。下の本文を手動で選択してください。</p>
          ) : null}
          <div className="answer-markdown">{answer}</div>
        </div>
      ) : (
        <div className="future-box">
          Codex回答はここに表示されます。Codex CLIにログインしていない場合やローカルサーバー未起動の場合は、上のプロンプトをコピーして手動で使えます。
        </div>
      )}
    </section>
  );
};
