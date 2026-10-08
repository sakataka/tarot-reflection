import { useEffect, useRef, useState, type RefObject } from "react";
import { requestBackend, streamBackend } from "../backendClient";
import type { Reading } from "../types/tarot";
import { tablePayload, type ReadingRecord } from "../utils/history";
import { isGatedSegment, narrationToPlainText, parseNarration, segmentStarts, type NarrationSegment } from "../utils/narration";
import type { NarrationPace } from "../utils/pace";
import { answerLabel } from "../utils/moment";
import { oracleName } from "../utils/persona";
import { playChime } from "../utils/sound";
import { tableCards } from "../utils/tarot";
import { Farewell } from "./Farewell";
import { FollowUpBox } from "./FollowUpBox";
import { NarrationView } from "./NarrationView";
import { OraclePortrait } from "./OraclePortrait";
import { cardMark, narrationCardId, orientationLabel } from "./ReadingTable";
import { Whisper } from "./Whisper";

type PromptBoxProps = {
  reading: Reading;
  active: boolean;
  pace: NarrationPace;
  whisperOn: boolean;
  onRecordsChange: () => void;
  revealed: boolean[];
  onRevealCard: (cardIndex: number) => void;
  onCurrentChange?: (cardIndex: number | null) => void;
  // 言葉を待つ間、占い師の手がかざされているカード（上の帯で光らせる）。
  onWaitingHover?: (cardIndex: number | null) => void;
  onSaved?: (record: ReadingRecord) => void;
  onDarken: () => void;
  onRelight: () => void;
};

const ordinalJa = ["一", "二", "三", "四", "五", "六", "七"];

// 言葉が届くまでの間、占い師が卓の上で何をしているかを順に告げる。最後の二つは繰り返す。
const waitingSteps = (positionNames: string[]) => [
  "伏せたカードを、卓に並べ終えました",
  ...positionNames.map((name) => `「${name}」のカードに、そっと手をかざしています`),
  "あなたの問いを、もう一度胸の中でなぞっています",
  "言葉が降りてくるまで、もう少しだけ",
];
const waitingStepInterval = 2600;

// 語りの速さ（1秒あたりの文字数）と、間の取り方。
const charsPerSecond = 24;
const tickInterval = 40;
const pauseAfterSentence = 260;
const pauseAfterParagraph = 650;
const pauseAfterFlip = 1300;
// 二枚目からは合図を待たず、一枚告げ終えるごとにこの間を置いて次を返す。
const pauseBetweenCards = 1100;
const pauseBeforeClosing = 900;

// 相談者の合図を待つ区切り。最初の一枚、総括、今夜の答え。二枚目以降のカードは続けて返す。
const needsCue = (segment: NarrationSegment, ordinal: number) => segment.kind !== "card" || ordinal === 0;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// 語りは区切りごとに止まり、相談者が促すと次のカードをめくる。本物の卓で、一枚ずつ間を置くように。
export const PromptBox = ({ reading, active, pace, whisperOn, onRecordsChange, revealed, onRevealCard, onCurrentChange, onWaitingHover, onSaved, onDarken, onRelight }: PromptBoxProps) => {
  const cardCount = tableCards(reading).length;
  const [raw, setRaw] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0);
  // 設定変更は、すでに受け取っている語りにも反映する。
  const instant = prefersReducedMotion() || pace === "instant";
  const [finished, setFinished] = useState(false);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [leaving, setLeaving] = useState(false);
  const answerTitle = answerLabel(new Date(reading.createdAt));
  // 語りに入った区切り（カード・総括・答え）の数と、相談者の合図を待っている区切り。
  const [entered, setEntered] = useState(0);
  const [awaitingOrdinal, setAwaitingOrdinal] = useState<number | null>(null);

  // タイマーからは最新の値を読む。
  const live = useRef({ raw, streamDone, cursor, instant, revealed, carry: 0, pauseUntil: 0, lastTick: 0, entered: 0, gatesOpened: 0, beatFor: -1 });
  live.current.raw = raw;
  live.current.streamDone = streamDone;
  live.current.instant = instant;
  live.current.revealed = revealed;
  const revealRef = useRef(onRevealCard);
  revealRef.current = onRevealCard;
  const currentRef = useRef(onCurrentChange);
  currentRef.current = onCurrentChange;
  const savedRef = useRef("");
  const [recordId, setRecordId] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // 占い師を呼ぶ。問いが変わるか再試行のたびに、語りを最初から受け取り直す。
  useEffect(() => {
    const abort = new AbortController();
    setRaw("");
    setStreamDone(false);
    setError("");
    setCursor(0);
    setFinished(false);
    setEntered(0);
    setAwaitingOrdinal(null);
    live.current.cursor = 0;
    live.current.pauseUntil = 0;
    live.current.entered = 0;
    live.current.gatesOpened = 0;
    live.current.beatFor = -1;

    streamBackend(
      "interpret/stream",
      tablePayload(reading),
      {
        signal: abort.signal,
        onDelta: (text) => setRaw((current) => current + text),
      },
    )
      .then(() => setStreamDone(true))
      .catch((caughtError: unknown) => {
        if (abort.signal.aborted) return;
        setError(caughtError instanceof TypeError
          ? "蝋燭がふっと揺れて、言葉が途切れました。（占いのサーバーに届きませんでした。起動しているか確かめてください）"
          : caughtError instanceof Error ? `言葉がうまく降りてきませんでした。（${caughtError.message}）` : "言葉がうまく降りてきませんでした。少し間を置いて、もう一度呼んでください。");
      });

    return () => abort.abort();
  }, [reading.createdAt, attempt]);

  // 届いた言葉を、話す速さで少しずつ紙へ移す。カードの合図に来たら一枚めくって、間を置く。
  useEffect(() => {
    live.current.lastTick = 0;
    if (finished || !active) return;
    const timer = window.setInterval(() => {
      const state = live.current;
      const now = performance.now();
      const elapsed = state.lastTick ? now - state.lastTick : tickInterval;
      state.lastTick = now;
      if (now < state.pauseUntil && !state.instant) return;

      const segments = parseNarration(state.raw, state.streamDone, cardCount);
      const starts = segmentStarts(segments);
      const total = starts.length ? starts[starts.length - 1] + segments[segments.length - 1].text.length : 0;

      const gated = segments.flatMap((segment, index) => (isGatedSegment(segment) ? [index] : []));

      for (let guard = 0; guard < cardCount + total + 4; guard += 1) {
        // 次の区切りに来たら、相談者の合図を待ってから入る。
        const nextGated = gated[state.entered];
        if (nextGated !== undefined && starts[nextGated] <= state.cursor) {
          const segment = segments[nextGated];
          if (!state.instant && state.gatesOpened <= state.entered) {
            if (needsCue(segment, state.entered)) {
              setAwaitingOrdinal(state.entered);
              return;
            }
            // 続けて返すカードは、一呼吸おいてからめくる。
            if (state.beatFor !== state.entered) {
              state.beatFor = state.entered;
              state.pauseUntil = now + pauseBetweenCards;
              return;
            }
          }
          state.entered += 1;
          setEntered(state.entered);
          setAwaitingOrdinal(null);
          if (segment.kind === "card") {
            state.revealed = state.revealed.map((isRevealed, index) => isRevealed || index === segment.cardIndex);
            revealRef.current(segment.cardIndex);
            currentRef.current?.(segment.cardIndex);
          } else {
            currentRef.current?.(null);
          }
          if (!state.instant) {
            state.pauseUntil = now + (segment.kind === "card" ? pauseAfterFlip : pauseBeforeClosing);
            return;
          }
          continue;
        }

        if (state.cursor >= total) {
          if (state.streamDone) {
            // 合図が抜けたカードも、語り終えたら表に返しておく。
            state.revealed.forEach((isRevealed, index) => {
              if (!isRevealed) revealRef.current(index);
            });
            currentRef.current?.(null);
            setAwaitingOrdinal(null);
            setFinished(true);
          }
          return;
        }

        const nextBoundary = starts.find((start) => start > state.cursor) ?? total;
        if (state.instant) {
          state.cursor = nextBoundary;
          setCursor(state.cursor);
          continue;
        }

        state.carry += (elapsed / 1000) * charsPerSecond;
        const step = Math.floor(state.carry);
        if (step < 1) return;
        state.carry -= step;

        const flat = segments.map((segment) => segment.text).join("");
        let nextCursor = state.cursor;
        let pause = 0;
        for (let count = 0; count < step && nextCursor < nextBoundary; count += 1) {
          const char = flat[nextCursor];
          nextCursor += 1;
          if (char === "\n" && flat[nextCursor] === "\n") {
            pause = pauseAfterParagraph;
            break;
          }
          if (char === "。" || char === "？" || char === "！") {
            pause = pauseAfterSentence;
            break;
          }
        }
        state.cursor = nextCursor;
        state.pauseUntil = pause ? now + pause : 0;
        setCursor(nextCursor);
        return;
      }
    }, tickInterval);
    return () => window.clearInterval(timer);
  }, [finished, cardCount, attempt, active]);

  const segments = parseNarration(raw, streamDone, cardCount);
  const starts = segmentStarts(segments);
  let gatedOrdinal = 0;
  const visibleSegments = segments
    .map((segment, index) => {
      const ordinal = isGatedSegment(segment) ? gatedOrdinal++ : -1;
      return { segment, ordinal, text: segment.text.slice(0, Math.max(0, cursor - starts[index])) };
    })
    .filter(({ segment, ordinal, text }) => (isGatedSegment(segment) ? ordinal < entered : text.length > 0));
  const awaiting = awaitingOrdinal === null ? null : segments.filter(isGatedSegment)[awaitingOrdinal] ?? null;
  const isWaiting = !error && !awaiting && visibleSegments.length === 0;
  // 答えの一文は、語りが届き終えてから囁きの声に回す。枠が開いたら囁く。
  const messageText = streamDone ? segments.find((segment) => segment.kind === "message")?.text.trim() ?? "" : "";
  const messageShown = visibleSegments.some(({ segment }) => segment.kind === "message");
  const isSpeaking = !finished && !isWaiting && !error && !awaiting;
  const waitingWords = waitingSteps(tableCards(reading).map((readingCard) => readingCard.position.name));

  useEffect(() => {
    if (!isWaiting) return;
    setWaitingIndex(0);
    const timer = window.setInterval(
      () => setWaitingIndex((index) => (index + 1 < waitingWords.length ? index + 1 : waitingWords.length - 2)),
      waitingStepInterval,
    );
    return () => window.clearInterval(timer);
  }, [isWaiting, waitingWords.length]);

  // 最初の一言は並べ終えた合図、そのあと位置ごとに手が渡る。言葉が届いたら手を離す。
  const hoveredCard = isWaiting && waitingIndex >= 1 && waitingIndex <= cardCount ? waitingIndex - 1 : null;
  useEffect(() => {
    onWaitingHover?.(hoveredCard);
  }, [hoveredCard, onWaitingHover]);

  useEffect(() => {
    if (finished) playChime();
  }, [finished]);

  // 新しいカードをめくったら、そのカードを目の前に持ってくる。
  const lastEntered = visibleSegments.filter(({ ordinal }) => ordinal >= 0).at(-1)?.segment;
  const lastEnteredId = lastEntered?.kind === "card" ? narrationCardId(lastEntered.cardIndex) : lastEntered ? `narration-${lastEntered.kind}` : "";
  useEffect(() => {
    if (!active || !lastEnteredId || live.current.instant) return;
    document.getElementById(lastEnteredId)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [lastEnteredId, active]);

  // 語りの筆先が画面の下に隠れたら、読んでいる場所までゆっくり送る。
  // 相談者が自分で読み返している間（最後の操作から少しの間）は動かさない。
  const lastUserScroll = useRef(0);
  useEffect(() => {
    const markUserScroll = () => {
      lastUserScroll.current = performance.now();
    };
    const events = ["wheel", "touchmove", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, markUserScroll, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, markUserScroll));
  }, []);
  useEffect(() => {
    if (!active || finished || instant || performance.now() - lastUserScroll.current < 2500) return;
    const caret = document.querySelector(".oracle-panel .ink-caret, .narration-gate");
    if (!caret) return;
    const bottom = caret.getBoundingClientRect().bottom;
    const limit = window.innerHeight - 96;
    if (bottom > limit) window.scrollBy({ top: bottom - limit + window.innerHeight * 0.25, behavior: "smooth" });
  }, [cursor, awaitingOrdinal, finished, instant, active]);

  const gateRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active && awaitingOrdinal !== null) gateRef.current?.focus({ preventScroll: true });
  }, [awaitingOrdinal, active]);

  const openGate = () => {
    live.current.gatesOpened = live.current.entered + 1;
    live.current.pauseUntil = 0;
    setAwaitingOrdinal(null);
  };

  // 語り終えた卓は記録に残す。次に来たとき、占い師が覚えていられるように。
  useEffect(() => {
    if (!streamDone || !raw.trim() || savedRef.current === reading.createdAt) return;
    savedRef.current = reading.createdAt;
    setSaveError(false);
    requestBackend<{ reading: ReadingRecord }>("readings", {
      method: "POST",
      body: { ...tablePayload(reading), narration: raw, createdAt: reading.createdAt },
    })
      .then(({ reading: record }) => {
        setRecordId(record.id);
        onSavedRef.current?.(record);
      })
      .catch(() => {
        // 記録に残せなくても、今夜の語りはそのまま読める。
        savedRef.current = "";
        setSaveError(true);
      });
  }, [streamDone, raw, reading, saveAttempt]);

  const flipped = tableCards(reading);
  const cardLabel = (cardIndex: number) => {
    const readingCard = flipped[cardIndex];
    return `${readingCard.position.name}・${readingCard.card.nameJa}（${orientationLabel[readingCard.orientation]}）`;
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(narrationToPlainText(segments, cardLabel, answerTitle));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const retry = () => {
    setAttempt((count) => count + 1);
  };

  return (
    <section className={finished ? "oracle-panel is-open" : "oracle-panel"} aria-busy={!finished && !error && !awaiting}>
      <div className="oracle-heading">
        <p className="ornament-kicker">{oracleName}の言葉</p>
        <h2>カードは、こう告げています</h2>
      </div>

      {isWaiting ? (
        <div className="thinking-box" aria-live="polite">
          <OraclePortrait pose="reading" />
          <p key={waitingIndex} className="thinking-words">{waitingWords[waitingIndex]}…</p>
        </div>
      ) : null}

      {visibleSegments.length > 0 ? (
        <NarrationView
          reading={reading}
          segments={visibleSegments}
          speaking={isSpeaking && !awaiting}
          animate={!instant}
          showNotes={finished}
          messageSlot={messageText ? <Whisper text={messageText} enabled={whisperOn} prefetch auto={messageShown} /> : null}
        />
      ) : null}

      {awaiting && !error ? (
        <Gate reading={reading} segment={awaiting} buttonRef={gateRef} answerTitle={answerTitle} onOpen={openGate} />
      ) : null}

      {isSpeaking ? <div className="narration-tail" aria-hidden="true" /> : null}

      {error ? (
        <div className="oracle-error" role="alert">
          <p className="copy-fallback">{error}</p>
          <button className="secondary-button" type="button" onClick={retry}>
            もう一度、{oracleName}を呼ぶ
          </button>
        </div>
      ) : null}

      {finished ? (
        <div className="answer-box">
          <p className="answer-closing">カードの言葉は答えではなく、足元を照らす灯りです。どちらへ歩くかは、あなたが決めてよいのです。</p>
          <div className="answer-actions">
            <button className="text-button" type="button" onClick={copyAnswer}>
              {copyState === "copied" ? "書き写しました" : "言葉を書き写す"}
            </button>
            {recordId ? <p className="answer-saved">☾ この夜の言葉は、帳面に綴じました</p> : null}
            {copyState === "failed" ? (
              <p className="copy-fallback">うまく書き写せませんでした。本文を選んで写してください。</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {streamDone && !recordId ? (
        <div className="oracle-save" role={saveError ? "alert" : "status"}>
          <p className="copy-fallback">{saveError
            ? "帳面のインクがかすれて、書き留められませんでした。言葉はこの画面で読めます。閉じる前に、もう一度綴じてください。"
            : `${oracleName}が、帳面に書き留めています…`}</p>
          {saveError ? <button className="secondary-button" type="button" onClick={() => { setSaveError(false); setSaveAttempt((count) => count + 1); }}>もう一度、帳面に綴じる</button> : null}
          {finished ? <p className="copy-fallback">帳面に綴じ終えると、聞き返せます。</p> : null}
        </div>
      ) : null}
      {finished && recordId ? <FollowUpBox reading={reading} narration={raw} recordId={recordId} onRecordsChange={onRecordsChange} /> : null}

      {finished ? (
        <div className="reading-end">
          <p>聞きたいことを聞き終えたら、卓を閉じましょう。</p>
          <button className="secondary-button" type="button" onClick={() => setLeaving(true)}>卓を閉じる</button>
        </div>
      ) : null}

      {leaving ? (
        <Farewell
          reading={reading}
          answer={messageText || answerFallback(segments)}
          onCancel={() => setLeaving(false)}
          onDarken={onDarken}
          onRelight={onRelight}
        />
      ) : null}
    </section>
  );
};

type GateProps = {
  reading: Reading;
  answerTitle: string;
  segment: NarrationSegment;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
};

// 語りの区切りで、次に何が起きるかを示して相談者の合図を待つ。
const Gate = ({ reading, segment, buttonRef, answerTitle, onOpen }: GateProps) => {
  const flipped = tableCards(reading);
  const next = segment.kind === "card" ? flipped[segment.cardIndex] : null;
  const isRoot = segment.kind === "card" && segment.cardIndex >= reading.cards.length;
  const count = flipped.length;
  const label = segment.kind === "card"
    ? isRoot ? "山の底をめくる" : count === 1 ? "カードをめくる" : segment.cardIndex === 0 ? "カードを返していく" : `${ordinalJa[segment.cardIndex]}枚目をめくる`
    : segment.kind === "close" ? "では、どういうことか" : `${answerTitle}を聞く`;
  const hint = next
    ? count > 1 && segment.kind === "card" && segment.cardIndex === 0
      ? `${count}枚を、順に表に返します`
      : `${segment.kind === "card" ? cardMark(reading, segment.cardIndex) : ""}・${next.position.name} ― ${next.position.role}`
    : segment.kind === "close" ? "すべてのカードが表になりました。並びを読み解きます" : "カードが告げていることを、ひとことに";

  return (
    <div className="narration-gate">
      <p>{hint}</p>
      <button ref={buttonRef} className="gate-button" type="button" onClick={onOpen}>
        <span aria-hidden="true">✦</span>
        <span>{label}</span>
        <span aria-hidden="true">✦</span>
      </button>
    </div>
  );
};

// 答えの合図が抜けた語りでも、総括の最後の一文を封書に綴じる。
const answerFallback = (segments: NarrationSegment[]) => {
  const tail = segments.filter((segment) => segment.kind === "close" || segment.kind === "message").at(-1)?.text.trim() ?? "";
  const sentences = tail.split(/(?<=。)/).filter((sentence) => sentence.trim());
  return sentences.at(-1)?.trim() ?? "";
};
