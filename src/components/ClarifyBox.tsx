import { useEffect, useRef, useState } from "react";
import { streamBackend } from "../backendClient";
import type { Exchange } from "../types/tarot";
import { oracleName } from "../utils/persona";

type ClarifyBoxProps = {
  question: string;
  onProceed: (clarification: Exchange | null) => void;
  onEdit: () => void;
};

const maxAnswerLength = 300;

// カードに触れる前に、占い師が問いを受け止めて一つだけ問い返す。答えは読みの材料になる。
export const ClarifyBox = ({ question, onProceed, onEdit }: ClarifyBoxProps) => {
  const [words, setWords] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [answer, setAnswer] = useState("");
  const boxRef = useRef<HTMLElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const abort = new AbortController();
    streamBackend("clarify/stream", { question }, {
      signal: abort.signal,
      onDelta: (text) => setWords((current) => current + text),
    })
      .then(() => setDone(true))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [question]);

  useEffect(() => {
    if (done) answerRef.current?.focus({ preventScroll: true });
  }, [done]);

  const proceedWithAnswer = () => onProceed(answer.trim() ? { question: words.trim(), answer: answer.trim() } : null);

  return (
    <section className="clarify-box" ref={boxRef} aria-live="polite">
      <p className="ornament-kicker">{oracleName}</p>
      {!done && !error ? (
        <div className="thinking-box is-compact">
          <span className="candle" aria-hidden="true">
            <span className="candle-glow" />
            <span className="candle-flame" />
            <span className="candle-wick" />
            <span className="candle-body" />
          </span>
          <p className="thinking-words">あなたの問いに、じっと耳を傾けています…</p>
        </div>
      ) : null}

      {done ? <p className="clarify-words">{words.trim()}</p> : null}
      {error ? <p className="clarify-words">…いいでしょう。言葉にならないものは、カードに聞いてみましょう。</p> : null}

      {done ? (
        <label className="field clarify-answer">
          <span className="field-heading">
            <strong>あなたの答え</strong>
            <small>{answer.length} / {maxAnswerLength}</small>
          </span>
          <textarea
            ref={answerRef}
            value={answer}
            maxLength={maxAnswerLength}
            rows={3}
            placeholder="思いつくままで構いません"
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
      ) : null}

      <div className="clarify-actions">
        <button className="text-button" type="button" onClick={onEdit}>問いを書き直す</button>
        {done ? (
          <>
            <button className="text-button" type="button" onClick={() => onProceed(null)}>答えずにカードへ</button>
            <button className="primary-button" type="button" disabled={!answer.trim()} onClick={proceedWithAnswer}>
              <span>答えて、カードを混ぜる</span>
            </button>
          </>
        ) : error ? (
          <button className="primary-button" type="button" onClick={() => onProceed(null)}>
            <span>カードを混ぜる</span>
          </button>
        ) : (
          <button className="text-button" type="button" onClick={() => onProceed(null)}>待たずにカードへ</button>
        )}
      </div>
    </section>
  );
};
