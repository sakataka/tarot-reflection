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
      const response = await invokeBackend<CodexInterpretationResponse>("interpret", {
        question: reading.question,
        spreadId: reading.spread.id,
        cards: reading.cards.map((readingCard) => ({
          cardId: readingCard.card.id,
          orientation: readingCard.orientation,
        })),
      });
      setAnswer(response.answer);
    } catch (caughtError) {
      setError(caughtError instanceof TypeError
        ? "読み解きに接続できませんでした。通信状態を確認して、もう一度お試しください。"
        : caughtError instanceof Error ? caughtError.message : "読み解きを取得できませんでした。少し時間を置いて、もう一度お試しください。");
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
    <section className="oracle-panel">
      <div className="section-heading">
        <div>
          <p className="section-number">✦</p>
          <h2>カードの読み解き</h2>
          <p>正解を決める言葉ではなく、今の自分を見つめるための手がかりです。</p>
        </div>
        {answer ? (
          <button className="secondary-button" type="button" onClick={copyAnswer}>
            {answerCopyState === "copied" ? "コピーしました" : "結果をコピー"}
          </button>
        ) : null}
      </div>

      {isAskingCodex ? (
        <div className="thinking-box" aria-live="polite">
          <span className="thinking-flame" />
          <div>
            <h3>カードを読み解いています</h3>
            <p>カードの象徴と相談内容をもとに、考える手がかりをまとめています。</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert">
          <p className="copy-fallback">{error}</p>
          <button className="secondary-button" type="button" disabled={isAskingCodex} onClick={askFortuneTeller}>
            もう一度読み解く
          </button>
        </div>
      ) : null}

      {answer ? (
        <div className="answer-box">
          {answerCopyState === "failed" ? (
            <p className="copy-fallback">コピーできませんでした。本文を手動で選択してください。</p>
          ) : null}
          <div className="answer-markdown" dangerouslySetInnerHTML={{ __html: renderedAnswer }} />
        </div>
      ) : null}

      <details className="hidden-prompt">
        <summary>手動で読み解くためのプロンプト</summary>
        <p>読み解きを取得できない場合は、このプロンプトをコピーして使えます。</p>
        <button className="secondary-button" type="button" onClick={copyPrompt}>
          {copyState === "copied" ? "コピーしました" : "プロンプトをコピー"}
        </button>
        {copyState === "failed" ? (
          <p className="copy-fallback">コピーできませんでした。下のテキストを手動で選択してください。</p>
        ) : null}
        <textarea className="prompt-textarea" value={prompt} readOnly rows={12} />
      </details>
    </section>
  );
};
