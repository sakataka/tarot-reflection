import { useEffect, useMemo, useState } from "react";
import { invokeBackend, type CodexInterpretationResponse } from "../backendClient";
import type { Reading } from "../types/tarot";
import { renderMarkdown } from "../utils/markdown";
import { generatePrompt } from "../utils/prompt";
import { playChime } from "../utils/sound";

type PromptBoxProps = {
  reading: Reading;
  isReady: boolean;
};

const requestedReadings = new Set<string>();

const waitingWords = [
  "並んだカードを、端から静かに見渡しています",
  "絵の中の灯りと影を、ひとつずつ拾っています",
  "あなたの問いと、カードの声を重ねています",
  "言葉がまとまるまで、もう少しだけ",
];

export const PromptBox = ({ reading, isReady }: PromptBoxProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answerCopyState, setAnswerCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isAskingCodex, setIsAskingCodex] = useState(false);
  const prompt = useMemo(() => generatePrompt(reading), [reading]);
  const renderedAnswer = useMemo(() => renderMarkdown(answer), [answer]);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const showAnswer = isReady && Boolean(answer);
  const isWaiting = !error && !showAnswer;

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
        ? "占い師のところまで声が届きませんでした。サーバーが起動しているか確かめて、もう一度呼んでみてください。"
        : caughtError instanceof Error ? caughtError.message : "今夜はうまく言葉が降りてきませんでした。少し間を置いて、もう一度呼んでみてください。");
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

  useEffect(() => {
    if (!isWaiting) return;
    const timer = window.setInterval(() => setWaitingIndex((index) => (index + 1) % waitingWords.length), 2800);
    return () => window.clearInterval(timer);
  }, [isWaiting]);

  useEffect(() => {
    if (!showAnswer) return;
    playChime();
  }, [showAnswer]);

  return (
    <section className={showAnswer ? "oracle-panel is-open" : "oracle-panel"}>
      <div className="oracle-heading">
        <p className="ornament-kicker">占い師の言葉</p>
        <h2>カードは、こう告げています</h2>
      </div>

      {isWaiting ? (
        <div className="thinking-box" aria-live="polite">
          <span className="candle" aria-hidden="true">
            <span className="candle-glow" />
            <span className="candle-flame" />
            <span className="candle-wick" />
            <span className="candle-body" />
          </span>
          <p key={waitingIndex} className="thinking-words">{waitingWords[waitingIndex]}…</p>
        </div>
      ) : null}

      {error ? (
        <div className="oracle-error" role="alert">
          <p className="copy-fallback">{error}</p>
          <button className="secondary-button" type="button" disabled={isAskingCodex} onClick={askFortuneTeller}>
            もう一度、占い師を呼ぶ
          </button>
        </div>
      ) : null}

      {showAnswer ? (
        <div className="answer-box">
          <div className="answer-markdown" dangerouslySetInnerHTML={{ __html: renderedAnswer }} />
          <p className="answer-closing">カードの言葉は答えではなく、足元を照らす灯りです。どちらへ歩くかは、あなたが決めてよいのです。</p>
          <div className="answer-actions">
            <button className="secondary-button" type="button" onClick={copyAnswer}>
              {answerCopyState === "copied" ? "書き写しました" : "言葉をコピーする"}
            </button>
            {answerCopyState === "failed" ? (
              <p className="copy-fallback">コピーできませんでした。本文を選んで書き写してください。</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <details className="hidden-prompt">
        <summary>手動で読み解くためのプロンプト</summary>
        <p>占い師を呼べないときは、このプロンプトをコピーしてお使いください。</p>
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
