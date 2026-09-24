import { useEffect, useRef, useState } from "react";
import { streamBackend } from "../backendClient";
import type { Reading } from "../types/tarot";
import {
  narrationToPlainText,
  parseNarration,
  segmentStarts,
  splitParagraphs,
  type NarrationSegment,
} from "../utils/narration";
import { playChime } from "../utils/sound";

type PromptBoxProps = {
  reading: Reading;
  revealed: boolean[];
  onRevealCard: (cardIndex: number) => void;
};

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];

const waitingWords = [
  "伏せたカードの上に、そっと手をかざしています",
  "あなたの問いを、もう一度胸の中でなぞっています",
  "一枚目に触れる前の、静かな間です",
  "言葉が降りてくるまで、もう少しだけ",
];

// 語りの速さ（1秒あたりの文字数）と、間の取り方。
const charsPerSecond = 24;
const tickInterval = 40;
const pauseAfterSentence = 260;
const pauseAfterParagraph = 650;
const pauseAfterFlip = 1500;
const pauseBeforeClosing = 900;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const PromptBox = ({ reading, revealed, onRevealCard }: PromptBoxProps) => {
  const cardCount = reading.cards.length;
  const [raw, setRaw] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [instant, setInstant] = useState(prefersReducedMotion);
  const [finished, setFinished] = useState(false);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // タイマーからは最新の値を読む。
  const live = useRef({ raw, streamDone, cursor, instant, revealed, carry: 0, pauseUntil: 0, lastTick: 0 });
  live.current.raw = raw;
  live.current.streamDone = streamDone;
  live.current.instant = instant;
  live.current.revealed = revealed;
  const revealRef = useRef(onRevealCard);
  revealRef.current = onRevealCard;

  // 占い師を呼ぶ。問いが変わるか再試行のたびに、語りを最初から受け取り直す。
  useEffect(() => {
    const abort = new AbortController();
    setRaw("");
    setStreamDone(false);
    setError("");
    setCursor(0);
    setFinished(false);
    live.current.cursor = 0;
    live.current.pauseUntil = 0;

    streamBackend(
      "interpret/stream",
      {
        question: reading.question,
        spreadId: reading.spread.id,
        cards: reading.cards.map((readingCard) => ({
          cardId: readingCard.card.id,
          orientation: readingCard.orientation,
        })),
      },
      {
        signal: abort.signal,
        onDelta: (text) => setRaw((current) => current + text),
      },
    )
      .then(() => setStreamDone(true))
      .catch((caughtError: unknown) => {
        if (abort.signal.aborted) return;
        setError(caughtError instanceof TypeError
          ? "占い師のところまで声が届きませんでした。サーバーが起動しているか確かめて、もう一度呼んでみてください。"
          : caughtError instanceof Error ? caughtError.message : "今夜はうまく言葉が降りてきませんでした。少し間を置いて、もう一度呼んでみてください。");
      });

    return () => abort.abort();
  }, [reading.createdAt, attempt]);

  // 届いた言葉を、話す速さで少しずつ紙へ移す。カードの合図に来たら一枚めくって、間を置く。
  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => {
      const state = live.current;
      const now = performance.now();
      const elapsed = state.lastTick ? now - state.lastTick : tickInterval;
      state.lastTick = now;
      if (now < state.pauseUntil && !state.instant) return;

      const segments = parseNarration(state.raw, state.streamDone, cardCount);
      const starts = segmentStarts(segments);
      const total = starts.length ? starts[starts.length - 1] + segments[segments.length - 1].text.length : 0;

      for (let guard = 0; guard < cardCount + total + 1; guard += 1) {
        const pendingFlip = segments.findIndex(
          (segment, index) => segment.kind === "card" && starts[index] <= state.cursor && !state.revealed[segment.cardIndex],
        );
        if (pendingFlip >= 0) {
          const segment = segments[pendingFlip] as Extract<NarrationSegment, { kind: "card" }>;
          state.revealed = state.revealed.map((isRevealed, index) => isRevealed || index === segment.cardIndex);
          revealRef.current(segment.cardIndex);
          if (!state.instant) {
            state.pauseUntil = now + pauseAfterFlip;
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
        if (nextCursor === nextBoundary && segments[starts.indexOf(nextBoundary)]?.kind === "close") {
          pause = Math.max(pause, pauseBeforeClosing);
        }

        state.cursor = nextCursor;
        state.pauseUntil = pause ? now + pause : 0;
        setCursor(nextCursor);
        return;
      }
    }, tickInterval);
    return () => window.clearInterval(timer);
  }, [finished, cardCount, attempt]);

  const segments = parseNarration(raw, streamDone, cardCount);
  const starts = segmentStarts(segments);
  const visibleSegments = segments
    .map((segment, index) => ({ segment, text: segment.text.slice(0, Math.max(0, cursor - starts[index])) }))
    .filter(({ segment, text }, index) =>
      segment.kind === "card" ? starts[index] <= cursor && revealed[segment.cardIndex] : text.length > 0 || (segment.kind === "close" && starts[index] < cursor));
  const isWaiting = !error && visibleSegments.length === 0;
  const isSpeaking = !finished && !isWaiting && !error;

  useEffect(() => {
    if (!isWaiting) return;
    const timer = window.setInterval(() => setWaitingIndex((index) => (index + 1) % waitingWords.length), 2800);
    return () => window.clearInterval(timer);
  }, [isWaiting]);

  useEffect(() => {
    if (finished) playChime();
  }, [finished]);

  const cardLabel = (cardIndex: number) => {
    const readingCard = reading.cards[cardIndex];
    return `${readingCard.position.name}・${readingCard.card.nameJa}（${orientationLabel[readingCard.orientation]}）`;
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(narrationToPlainText(segments, cardLabel));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const retry = () => {
    setInstant(prefersReducedMotion());
    setAttempt((count) => count + 1);
  };

  const lastVisible = visibleSegments.length - 1;

  return (
    <section className={finished ? "oracle-panel is-open" : "oracle-panel"} aria-busy={!finished && !error}>
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

      {visibleSegments.length > 0 ? (
        <div className="narration">
          {visibleSegments.map(({ segment, text }, segmentIndex) => {
            const paragraphs = splitParagraphs(text);
            const isLast = segmentIndex === lastVisible;
            return (
              <div className={`narration-segment is-${segment.kind}`} key={`${segment.kind}-${segment.kind === "card" ? segment.cardIndex : segmentIndex}`}>
                {segment.kind === "card" ? <NarrationCardHeader reading={reading} cardIndex={segment.cardIndex} /> : null}
                {segment.kind === "close" ? <p className="narration-divider" aria-hidden="true">✦</p> : null}
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>
                    {paragraph}
                    {isSpeaking && isLast && index === paragraphs.length - 1 ? <span className="ink-caret" aria-hidden="true" /> : null}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}

      {isSpeaking ? (
        <div className="narration-skip">
          <button className="text-button" type="button" onClick={() => setInstant(true)} disabled={instant}>
            {instant ? "言葉が届くのを待っています" : "語りを先まで読む"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="oracle-error" role="alert">
          <p className="copy-fallback">{error}</p>
          <button className="secondary-button" type="button" onClick={retry}>
            もう一度、占い師を呼ぶ
          </button>
        </div>
      ) : null}

      {finished ? (
        <div className="answer-box">
          <p className="answer-closing">カードの言葉は答えではなく、足元を照らす灯りです。どちらへ歩くかは、あなたが決めてよいのです。</p>
          <div className="answer-actions">
            <button className="secondary-button" type="button" onClick={copyAnswer}>
              {copyState === "copied" ? "書き写しました" : "言葉をコピーする"}
            </button>
            {copyState === "failed" ? (
              <p className="copy-fallback">コピーできませんでした。本文を選んで書き写してください。</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};

const NarrationCardHeader = ({ reading, cardIndex }: { reading: Reading; cardIndex: number }) => {
  const readingCard = reading.cards[cardIndex];
  return (
    <div className="narration-card">
      <span className={readingCard.orientation === "reversed" ? "narration-card-thumb is-reversed" : "narration-card-thumb"} aria-hidden="true">
        <img src={readingCard.card.imagePath} alt="" />
      </span>
      <span className="narration-card-label">
        <small>{romanNumerals[cardIndex]}・{readingCard.position.name}</small>
        <strong>{readingCard.card.nameJa}</strong>
        <em>{orientationLabel[readingCard.orientation]}</em>
      </span>
    </div>
  );
};
