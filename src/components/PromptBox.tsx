import { useEffect, useMemo, useState } from "react";
import { invokeBackend, type CodexInterpretationResponse } from "../backendClient";
import type { Reading } from "../types/tarot";
import { renderMarkdown } from "../utils/markdown";
import { generatePrompt } from "../utils/prompt";

type PromptBoxProps = {
  reading: Reading;
};

const requestedReadings = new Set<string>();

export const PromptBox = ({ reading }: PromptBoxProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answerCopyState, setAnswerCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isAskingCodex, setIsAskingCodex] = useState(false);
  const prompt = useMemo(() => generatePrompt(reading), [reading]);
  const renderedAnswer = useMemo(() => renderMarkdown(answer), [answer]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const askFortuneTeller = async () => {
    setIsAskingCodex(true);
    setError("");
    setAnswer("");
    setAnswerCopyState("idle");

    try {
      const response = await invokeBackend<CodexInterpretationResponse>("interpret", { prompt });
      setAnswer(response.answer);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "水晶が曇りました。少し時間を置いて、もう一度お試しください。");
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

  useEffect(() => {
    if (requestedReadings.has(reading.createdAt)) {
      return;
    }

    requestedReadings.add(reading.createdAt);
    void askFortuneTeller();
  }, [reading.createdAt]);

  return (
    <section className="panel oracle-panel">
      <div className="section-heading">
        <div>
          <p className="app-kicker">The oracle speaks</p>
          <h2>占い師の言葉</h2>
        </div>
        {answer ? (
          <button className="secondary-button" type="button" onClick={copyAnswer}>
            {answerCopyState === "copied" ? "写し取りました" : "言葉を写す"}
          </button>
        ) : null}
      </div>

      {isAskingCodex ? (
        <div className="thinking-box" aria-live="polite">
          <span className="thinking-flame" />
          <div>
            <h3>カードの声を聞いています</h3>
            <p>占い師が、開かれたカードとあなたの問いを静かに結び直しています。</p>
          </div>
        </div>
      ) : null}

      {error ? <p className="copy-fallback">{error}</p> : null}

      {answer ? (
        <div className="answer-box">
          {answerCopyState === "failed" ? (
            <p className="copy-fallback">言葉を写せませんでした。本文を手動で選択してください。</p>
          ) : null}
          <div className="answer-markdown" dangerouslySetInnerHTML={{ __html: renderedAnswer }} />
        </div>
      ) : (
        <div className="future-box">
          まだ言葉は降りてきていません。卓の上のカードが、少しずつ意味を帯びていきます。
        </div>
      )}

      <details className="hidden-prompt">
        <summary>控えを開く</summary>
        <p>うまく言葉が届かない時だけ、この控えを写して使えます。</p>
        <button className="secondary-button" type="button" onClick={copyPrompt}>
          {copyState === "copied" ? "控えを写しました" : "控えを写す"}
        </button>
        {copyState === "failed" ? (
          <p className="copy-fallback">控えを写せませんでした。下のテキストを手動で選択してください。</p>
        ) : null}
        <textarea className="prompt-textarea" value={prompt} readOnly rows={12} />
      </details>
    </section>
  );
};
