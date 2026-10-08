import { useEffect, useRef, useState } from "react";
import { streamBackend } from "../backendClient";
import type { Exchange } from "../types/tarot";
import { maxReplyLength as maxAnswerLength } from "../utils/limits";
import { oracleName } from "../utils/persona";
import { LetterPaper } from "./LetterPaper";
import { OraclePortrait } from "./OraclePortrait";

type ClarifyBoxProps = {
  active: boolean;
  question: string;
  onProceed: (clarification: Exchange | null) => void;
  onEdit: () => void;
};


// カードに触れる前に、占い師が問いを受け止めて一つだけ問い返す。答えは読みの材料になる。
export const ClarifyBox = ({ active, question, onProceed, onEdit }: ClarifyBoxProps) => {
  const [words, setWords] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [answer, setAnswer] = useState("");
  const boxRef = useRef<HTMLElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
    if (!active) return;
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (done) answerRef.current?.focus({ preventScroll: true });
  }, [done, active]);

  const proceedWithAnswer = () => onProceed(answer.trim() ? { question: words.trim(), answer: answer.trim() } : null);

  return (
    <section className="clarify-box" ref={boxRef} aria-live="polite">
      <div className={done || error ? "clarify-oracle has-spoken" : "clarify-oracle"}>
        <OraclePortrait pose="listening" />
        <div className="clarify-speech">
          <p className="ornament-kicker">{oracleName}</p>
          {!done && !error && !words.trim() ? <p className="thinking-words is-steady">あなたの問いに、じっと耳を傾けています…</p> : null}
          {/* 届いた言葉から順に見せる。話し終えるまで筆先を灯す。 */}
          {words.trim() && !error ? (
            <p className="clarify-words">
              {words.trim()}
              {!done ? <span className="ink-caret" aria-hidden="true" /> : null}
            </p>
          ) : null}
          {error ? <p className="clarify-words">…いいでしょう。言葉にならないものは、カードに聞いてみましょう。</p> : null}
        </div>
      </div>

      {done ? (
        <LetterPaper
          className="clarify-answer"
          textareaRef={answerRef}
          value={answer}
          maxLength={maxAnswerLength}
          rows={3}
          label={`${oracleName}への答え`}
          placeholder="思いつくままで構いません"
          onChange={setAnswer}
        />
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
