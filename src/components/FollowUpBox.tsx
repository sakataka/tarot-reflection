import { useEffect, useRef, useState } from "react";
import { requestBackend, streamBackend } from "../backendClient";
import type { Exchange, Reading } from "../types/tarot";
import { maxFollowUps, tablePayload } from "../utils/history";
import { cleanNarrationText, splitParagraphs } from "../utils/narration";
import { maxReplyLength as maxAskLength } from "../utils/limits";
import { oracleName } from "../utils/persona";
import { playChime } from "../utils/sound";

type FollowUpBoxProps = {
  reading: Reading;
  narration: string;
  recordId: string;
  onRecordsChange: () => void;
};


// 占い師と相談者のやりとりを並べる。記録の読み返しでも使う。
export const ExchangeList = ({ exchanges }: { exchanges: readonly Exchange[] }) => (
  <div className="exchange-list">
    {exchanges.map((exchange, index) => (
      <div className="exchange" key={index}>
        <p className="exchange-ask"><span>あなた</span>{exchange.question}</p>
        <div className="exchange-answer">
          <span>{oracleName}</span>
          {splitParagraphs(cleanNarrationText(exchange.answer)).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </div>
      </div>
    ))}
  </div>
);

// 語り終えたあと、二度まで占い師に聞き返せる。新しいカードは引かず、卓のカードを見直してもらう。
export const FollowUpBox = ({ reading, narration, recordId, onRecordsChange }: FollowUpBoxProps) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [ask, setAsk] = useState("");
  const [pending, setPending] = useState<Exchange | null>(null);
  const [error, setError] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const remaining = maxFollowUps - exchanges.length;

  useEffect(() => () => abortRef.current?.abort(), []);

  const save = async (exchange: Exchange) => {
    setSaveFailed(false);
    setError("");
    try {
      await requestBackend(`readings/${recordId}/follow-ups`, { method: "POST", body: exchange });
      setExchanges((current) => [...current, exchange]);
      setPending(null);
      setAsk("");
      onRecordsChange();
      playChime();
    } catch {
      setSaveFailed(true);
      setError("答えは届きましたが、記録を残せませんでした。もう一度保存してください。");
    }
  };

  const send = () => {
    const question = ask.trim();
    if (!question || pending || remaining <= 0) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setError("");
    setSaveFailed(false);
    setPending({ question, answer: "" });
    let answer = "";
    streamBackend(
      "follow-up/stream",
      {
        ...tablePayload(reading),
        narration,
        previous: exchanges,
        ask: question,
        recordId,
      },
      {
        signal: abort.signal,
        onDelta: (text) => {
          answer += text;
          setPending({ question, answer });
        },
      },
    )
      .then(() => {
        const exchange = { question, answer: answer.trim() };
        setPending(exchange);
        return save(exchange);
      })
      .catch((caughtError: unknown) => {
        if (abort.signal.aborted) return;
        setError(caughtError instanceof Error ? caughtError.message : "言葉が届きませんでした。");
        setPending(null);
      });
  };

  return (
    <div className="follow-up">
      <div className="follow-up-heading">
        <p className="ornament-kicker">もう少しだけ</p>
        <p>気になったことがあれば、{oracleName}に聞き返せます。{remaining > 0 ? `今夜はあと${remaining}度まで。` : ""}</p>
      </div>

      <ExchangeList exchanges={exchanges} />

      {pending ? (
        <div className="exchange is-pending" aria-live="polite">
          <p className="exchange-ask"><span>あなた</span>{pending.question}</p>
          {pending.answer.trim() ? (
            <div className="exchange-answer">
              <span>{oracleName}</span>
              {splitParagraphs(cleanNarrationText(pending.answer)).map((paragraph, index, paragraphs) => (
                <p key={index}>
                  {paragraph}
                  {!saveFailed && index === paragraphs.length - 1 ? <span className="ink-caret" aria-hidden="true" /> : null}
                </p>
              ))}
            </div>
          ) : (
            <p className="thinking-words is-steady">{oracleName}が卓のカードを見つめ直しています…</p>
          )}
        </div>
      ) : null}

      {error ? <p className="copy-fallback" role="alert">{error}</p> : null}
      {saveFailed && pending ? (
        <button className="secondary-button" type="button" onClick={() => void save(pending)}>聞き返しの保存をやり直す</button>
      ) : null}

      {remaining > 0 && !pending ? (
        <form className="follow-up-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
          <textarea
            value={ask}
            maxLength={maxAskLength}
            rows={2}
            placeholder="たとえば「山の底のカードが、もう少し気になります」"
            aria-label={`${oracleName}に聞き返す`}
            onChange={(event) => setAsk(event.target.value)}
          />
          <button className="secondary-button" type="submit" disabled={!ask.trim()}>聞き返す</button>
        </form>
      ) : null}

      {remaining <= 0 ? <p className="follow-up-closed">今夜の卓は、ここで閉じましょう。</p> : null}
    </div>
  );
};
