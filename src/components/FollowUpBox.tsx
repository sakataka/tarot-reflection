import { useEffect, useRef, useState, type RefObject } from "react";
import { requestBackend, streamBackend } from "../backendClient";
import type { Exchange, Reading } from "../types/tarot";
import { maxFollowUps, tablePayload, type CardRecord } from "../utils/history";
import { cleanNarrationText, splitParagraphs } from "../utils/narration";
import { maxReplyLength as maxAskLength } from "../utils/limits";
import { oracleName } from "../utils/persona";
import { playChime } from "../utils/sound";
import { tarotDeck } from "../data/tarotDeck";
import { CardView } from "./CardView";
import { LetterPaper } from "./LetterPaper";
import { OraclePortrait } from "./OraclePortrait";

type FollowUpBoxProps = {
  active: boolean;
  reading: Reading;
  narration: string;
  recordId: string;
  onRecordsChange: () => void;
  onBusyChange: (busy: boolean) => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
};


// 占い師と相談者のやりとりを並べる。記録の読み返しでも使う。
const ClarifierCard = ({ card: record }: { card: CardRecord }) => {
  const card = tarotDeck.find((item) => item.id === record.cardId);
  return card ? <div className="clarifier-card"><p className="ornament-kicker">補足の一枚</p><CardView card={card} orientation={record.orientation} /></div> : null;
};

export const ExchangeList = ({ exchanges }: { exchanges: readonly Exchange[] }) => (
  <div className="exchange-list">
    {exchanges.map((exchange, index) => (
      <div className="exchange" key={index}>
        <p className="exchange-ask"><span>あなた</span>{exchange.question}</p>
        {exchange.clarifier ? <ClarifierCard card={exchange.clarifier} /> : null}
        <div className="exchange-answer">
          <span>{oracleName}</span>
          {splitParagraphs(cleanNarrationText(exchange.answer)).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </div>
      </div>
    ))}
  </div>
);

// 聞き返しには任意で補足札を一枚添える。確定済みの札と答えを再試行で失わない。
export const FollowUpBox = ({ active, reading, narration, recordId, onRecordsChange, onBusyChange, closeButtonRef }: FollowUpBoxProps) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [ask, setAsk] = useState("");
  const [pending, setPending] = useState<Exchange | null>(null);
  const [error, setError] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef(false);
  const [drawClarifier, setDrawClarifier] = useState(false);
  const [reserved, setReserved] = useState<{ question: string; clarifier: CardRecord | null } | null>(null);
  const remaining = maxFollowUps - exchanges.length;

  useEffect(() => () => abortRef.current?.abort(), []);

  // 操作で消えたボタンから、次の入力先・回復操作へ戻す。別の部屋や操作へ移った人からは奪わない。
  useEffect(() => {
    if (!active || !focusNext.current || (pending && !saveFailed)) return;
    focusNext.current = false;
    const focused = document.activeElement;
    if (focused !== document.body && focused && !boxRef.current?.contains(focused)) return;
    const target = saveFailed ? saveRef.current : reserved ? retryRef.current : remaining <= 0 ? closeButtonRef.current : askRef.current;
    target?.focus();
    if (target === askRef.current) askRef.current?.setSelectionRange(ask.length, ask.length);
  }, [active, pending, saveFailed, reserved, ask, remaining, closeButtonRef]);

  const save = async (exchange: Exchange) => {
    setSaving(true);
    setSaveFailed(false);
    setError("");
    try {
      await requestBackend(`readings/${recordId}/follow-ups`, { method: "POST", body: exchange });
      setExchanges((current) => [...current, exchange]);
      setPending(null);
      setAsk("");
      setReserved(null);
      setDrawClarifier(false);
      onRecordsChange();
      playChime();
    } catch {
      setSaveFailed(true);
      setError("答えは届きましたが、帳面に書き留められませんでした。卓を閉じる前に、もう一度綴じてください。答えを聞き直す必要はありません。");
    } finally {
      setSaving(false);
    }
  };

  const retrySave = async () => {
    if (!pending || busyRef.current) return;
    busyRef.current = true;
    focusNext.current = true;
    onBusyChange(true);
    try {
      await save(pending);
    } finally {
      busyRef.current = false;
      onBusyChange(false);
    }
  };

  // 補足の一枚を引くかどうかは、送るボタンで選ぶ。言葉を待ち直すときは、先に選んだほうを使う。
  const send = async (draw = drawClarifier) => {
    const question = ask.trim();
    if (!question || pending || remaining <= 0 || busyRef.current) return;
    busyRef.current = true;
    focusNext.current = true;
    onBusyChange(true);
    const abort = new AbortController();
    abortRef.current = abort;
    setError("");
    setSaveFailed(false);
    setPending({ question, answer: "" });
    try {
      const prepared = await requestBackend<{ previous: Exchange[]; clarifier: CardRecord | null; completed: boolean }>(`readings/${recordId}/follow-up`, {
        method: "POST", body: { ask: question, drawClarifier: draw },
      });
      if (abort.signal.aborted) return;
      setExchanges(prepared.previous);
      if (prepared.completed) {
        setPending(null); setReserved(null); setAsk(""); setDrawClarifier(false); onRecordsChange();
        return;
      }
      setReserved({ question, clarifier: prepared.clarifier });
      const extra = prepared.clarifier ? { clarifier: prepared.clarifier } : {};
      setPending({ question, answer: "", ...extra });
      let answer = "";
      await streamBackend(
        "follow-up/stream",
        {
          ...tablePayload(reading),
          narration,
          previous: prepared.previous,
          ask: question,
          recordId,
          drawClarifier: draw,
        },
        {
          signal: abort.signal,
          onDelta: (text) => {
            answer += text;
            setPending({ question, answer, ...extra });
          },
        },
      );
      const exchange = { question, answer: answer.trim(), ...extra };
      setPending(exchange);
      await save(exchange);
    } catch (caughtError: unknown) {
      if (abort.signal.aborted) return;
      setError(caughtError instanceof Error ? `言葉が途切れました。問いは残っています。もう一度、聞いてください。（${caughtError.message}）` : "言葉が途切れました。問いは残っています。もう一度、聞いてください。");
      setPending(null);
    } finally {
      busyRef.current = false;
      onBusyChange(false);
    }
  };

  return (
    <div className="follow-up" ref={boxRef}>
      {remaining > 0 ? (
        <div className="follow-up-heading">
          <OraclePortrait pose="listening" size="small" />
          <p>{remaining > 1
            ? "まだ胸に引っかかるものがあるなら、聞かせて。見えにくいところは、山からもう一枚引いて照らしましょう。"
            : "最後にもう一つだけ、聞きましょう。"}</p>
        </div>
      ) : null}

      <ExchangeList exchanges={exchanges} />

      {pending ? (
        <div className="exchange is-pending" aria-live="polite">
          <p className="exchange-ask"><span>あなた</span>{pending.question}</p>
          {pending.clarifier ? <ClarifierCard card={pending.clarifier} /> : null}
          {pending.answer.trim() ? (
            <div className="exchange-answer">
              <span>{oracleName}</span>
              {splitParagraphs(cleanNarrationText(pending.answer)).map((paragraph, index, paragraphs) => (
                <p key={index}>
                  {paragraph}
                  {!saveFailed && !saving && index === paragraphs.length - 1 ? <span className="ink-caret" aria-hidden="true" /> : null}
                </p>
              ))}
            </div>
          ) : (
            <p className="thinking-words is-steady">{oracleName}が{pending.clarifier ? "補足の一枚と卓のカード" : "卓のカード"}を見つめ直しています…</p>
          )}
        </div>
      ) : null}

      {error ? <p className="copy-fallback" role="alert">{error}</p> : null}
      {saving ? <p className="answer-saved" role="status">答えを帳面に綴じています…</p> : null}
      {saveFailed && pending ? (
        <button ref={saveRef} className="secondary-button" type="button" onClick={() => void retrySave()}>もう一度、帳面に綴じる</button>
      ) : null}

      {remaining > 0 && !pending ? (
        <form className="follow-up-form" onSubmit={(event) => { event.preventDefault(); void send(reserved ? drawClarifier : false); }}>
          <LetterPaper
            className="follow-up-paper"
            textareaRef={askRef}
            value={ask}
            readOnly={Boolean(reserved)}
            maxLength={maxAskLength}
            rows={2}
            label={`${oracleName}に聞き返す`}
            onChange={setAsk}
          />
          {reserved ? <p className="follow-up-retry-note" role="note">この問いは受け付け済みです。{reserved.clarifier ? "補足の一枚もそのままに、" : "問いを変えずに、"}「もう一度、聞く」で続きをたずねられます。</p> : null}
          {reserved?.clarifier ? <ClarifierCard card={reserved.clarifier} /> : null}
          <div className="follow-up-actions">
            {reserved ? (
              <button ref={retryRef} className="secondary-button" type="submit" disabled={!ask.trim()}>もう一度、聞く</button>
            ) : (
              <>
                <button className="text-button" type="submit" disabled={!ask.trim()}>このまま聞く</button>
                <button className="secondary-button" type="button" disabled={!ask.trim()} onClick={() => { setDrawClarifier(true); void send(true); }}>
                  もう一枚引いて、照らす
                </button>
              </>
            )}
          </div>
        </form>
      ) : null}

      {remaining <= 0 ? <p className="follow-up-closed">この卓で聞けるのは、ここまで。</p> : null}
    </div>
  );
};
