import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { DrawnCard, SelectedCard } from "../types/tarot";
import { playDeal, playPick, playPlace, playShuffle } from "../utils/sound";
import { cutPileCount } from "../utils/tarot";

// 混ぜる → 手を止める → 山を三つに分けて一つ選ぶ → 集めて広げる → 引く
type Phase = "shuffling" | "cutting" | "gathering" | "dealing" | "ready";

const shuffleLoop = 2100;
const stopAvailableAfter = 900;
const gatherDuration = 750;
const dealStagger = 9;
const dealDuration = 700;
const riffleCards = 12;

type CardBackGridProps = {
  cards: DrawnCard[];
  selectedCards: SelectedCard[];
  requiredCount: number;
  onStopShuffle: () => void;
  onCut: (pileIndex: number) => void;
  onToggleCard: (drawnCard: DrawnCard) => void;
  onReveal: () => void;
  onReshuffle: () => void;
};

type FanLayout = {
  cardWidth: number;
  cardHeight: number;
  height: number;
  positions: { x: number; y: number; angle: number }[];
  stack: { x: number; y: number };
};

type PileLayout = {
  scale: number;
  positions: { x: number; y: number }[];
};

// 卓の幅に合わせて、78枚を数段の弧に広げる。後ろの段ほど奥に置き、手前の段が少し重なる。
const computeFanLayout = (width: number, count: number): FanLayout => {
  const rows = width >= 900 ? 2 : width >= 600 ? 3 : 6;
  const perRow = Math.ceil(count / rows);
  const cardWidth = Math.round(Math.min(rows === 2 ? 84 : rows === 3 ? 70 : 52, width / (rows === 6 ? 7.4 : 8)));
  const cardHeight = Math.round(cardWidth * 1.5);
  const rowGap = Math.round(cardHeight * (rows === 6 ? 0.66 : 0.78));
  const sag = Math.round(cardHeight * (rows === 6 ? 0.2 : 0.42));
  const maxAngle = rows === 6 ? 9 : 13;
  const lift = 34;
  const span = width - cardWidth - 8;

  const positions = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const column = index - row * perRow;
    const t = inRow === 1 ? 0 : (column / (inRow - 1)) * 2 - 1;
    const rowSpan = span * (inRow / perRow);
    return {
      x: width / 2 - cardWidth / 2 + (t * rowSpan) / 2,
      y: lift + row * rowGap + sag * t * t,
      angle: t * maxAngle,
    };
  });

  return {
    cardWidth,
    cardHeight,
    height: lift + (rows - 1) * rowGap + sag + cardHeight + 12,
    positions,
    stack: { x: width / 2 - cardWidth / 2, y: lift + ((rows - 1) * rowGap + sag) / 2 },
  };
};

// 手のひらで扱う山は、卓に広げたカードより少し大きく見せる。
const computePileLayout = (width: number, layout: FanLayout): PileLayout => {
  const scale = layout.cardWidth < 60 ? 1.5 : 1.2;
  const gap = Math.min(width / 3.1, layout.cardWidth * scale * 2.2);
  return {
    scale,
    positions: Array.from({ length: cutPileCount }, (_, index) => ({
      x: layout.stack.x + (index - (cutPileCount - 1) / 2) * gap,
      y: layout.stack.y,
    })),
  };
};

const pileNames = ["左の山", "中央の山", "右の山"];

export const CardBackGrid = ({
  cards,
  selectedCards,
  requiredCount,
  onStopShuffle,
  onCut,
  onToggleCard,
  onReveal,
  onReshuffle,
}: CardBackGridProps) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState<Phase>("shuffling");
  const [canStop, setCanStop] = useState(false);
  const selectedById = new Map(selectedCards.map((selectedCard) => [selectedCard.card.id, selectedCard]));
  const isComplete = selectedCards.length === requiredCount;
  const remaining = requiredCount - selectedCards.length;

  useLayoutEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase === "shuffling") {
      // 手を止めるまで、リフルを繰り返す。
      playShuffle();
      const loop = window.setInterval(playShuffle, shuffleLoop);
      const enableStop = window.setTimeout(() => setCanStop(true), stopAvailableAfter);
      return () => {
        window.clearInterval(loop);
        window.clearTimeout(enableStop);
      };
    }
    if (phase === "gathering") {
      const timer = window.setTimeout(() => setPhase("dealing"), gatherDuration);
      return () => window.clearTimeout(timer);
    }
    if (phase === "dealing") {
      playDeal();
      const timer = window.setTimeout(() => setPhase("ready"), cards.length * dealStagger + dealDuration);
      return () => window.clearTimeout(timer);
    }
  }, [phase, cards.length]);

  const stopShuffle = () => {
    playPlace();
    onStopShuffle();
    setPhase("cutting");
  };

  const choosePile = (pileIndex: number) => {
    playPick();
    onCut(pileIndex);
    setPhase("gathering");
  };

  const layout = width > 0 ? computeFanLayout(width, cards.length) : null;
  const piles = layout ? computePileLayout(width, layout) : null;
  const pileSize = Math.ceil(cards.length / cutPileCount);
  const isSpread = phase === "dealing" || phase === "ready";

  const cardTransform = (index: number) => {
    if (!layout || !piles) return { transform: "", zIndex: index };
    if (isSpread) {
      const target = layout.positions[index];
      return { transform: `translate(${target.x}px, ${target.y}px) rotate(${target.angle}deg)`, zIndex: index };
    }
    if (phase === "cutting") {
      const pile = Math.floor(index / pileSize);
      const depth = index - pile * pileSize;
      const target = piles.positions[pile];
      return {
        transform: `translate(${target.x}px, ${target.y - depth * 0.4}px) scale(${piles.scale})`,
        zIndex: index,
      };
    }
    // 混ぜている間と集めている間は一つの山。先頭（選んだ山）が一番上に来る。
    const depth = cards.length - index;
    return {
      transform: `translate(${layout.stack.x}px, ${layout.stack.y - depth * 0.12}px) scale(${phase === "gathering" ? piles.scale : 1})`,
      zIndex: depth,
    };
  };

  const heading = {
    shuffling: {
      kicker: "Shuffle",
      title: "カードを混ぜています",
      text: "問いを胸の中でつぶやいてください。ここだ、と思ったところで手を止めます。",
    },
    cutting: {
      kicker: "Cut",
      title: "山を三つに分けました",
      text: "心が向いた山をひとつ選んでください。その山が、いちばん上に来ます。",
    },
    draw: {
      kicker: "Draw",
      title: "カードを引く",
      text: "考えすぎなくて大丈夫。目が止まったカード、指が呼ばれたカードに触れてください。",
    },
  }[phase === "shuffling" || phase === "cutting" ? phase : "draw"];

  return (
    <section className={`table-panel is-${phase}`}>
      <div className="section-heading">
        <div>
          <p className="ornament-kicker">{heading.kicker}</p>
          <h1>{heading.title}</h1>
          <p>{heading.text}</p>
        </div>
        <div className="selection-counter" aria-live="polite">
          <strong>{selectedCards.length}</strong>
          <span>/ {requiredCount} 枚</span>
        </div>
      </div>

      <div className="tarot-table">
        <div
          className="card-field"
          ref={fieldRef}
          aria-label="卓に広げた裏向きのカード"
          style={layout ? { height: layout.height, "--card-w": `${layout.cardWidth}px`, "--card-h": `${layout.cardHeight}px` } as CSSProperties : undefined}
        >
          {layout && phase === "shuffling" ? (
            <div className="riffle" aria-hidden="true" style={{ left: layout.stack.x, top: layout.stack.y }}>
              {Array.from({ length: riffleCards }, (_, index) => (
                <span
                  className={index % 2 === 0 ? "riffle-card is-left" : "riffle-card is-right"}
                  key={index}
                  style={{ "--i": Math.floor(index / 2) } as CSSProperties}
                />
              ))}
            </div>
          ) : null}

          {layout && piles && phase === "cutting" ? piles.positions.map((position, pileIndex) => (
            <button
              className="cut-pile"
              key={pileIndex}
              type="button"
              aria-label={`${pileNames[pileIndex]}を選ぶ`}
              onClick={() => choosePile(pileIndex)}
              style={{
                left: position.x + (layout.cardWidth * (1 - piles.scale)) / 2,
                top: position.y + layout.cardHeight * (1 - piles.scale) - 12,
                width: layout.cardWidth * piles.scale,
                height: layout.cardHeight * piles.scale + 12,
              }}
            >
              <span>{pileNames[pileIndex]}</span>
            </button>
          )) : null}

          {layout ? cards.map((drawnCard, index) => {
            const selected = selectedById.get(drawnCard.card.id);
            const disabled = phase !== "ready" || (!selected && selectedCards.length >= requiredCount);
            const placement = cardTransform(index);

            return (
              <button
                className={selected ? "card-back is-selected" : "card-back"}
                key={drawnCard.card.id}
                type="button"
                disabled={disabled}
                aria-label={`${index + 1}番目の裏向きカード${selected ? `、${selected.selectedOrder}枚目として選択中` : ""}`}
                aria-pressed={Boolean(selected)}
                onClick={() => onToggleCard(drawnCard)}
                tabIndex={phase === "ready" ? undefined : -1}
                style={{
                  transform: placement.transform,
                  transitionDelay: phase === "dealing" ? `${index * dealStagger}ms` : "0ms",
                  zIndex: selected ? cards.length + selected.selectedOrder : placement.zIndex,
                }}
              >
                <span className="card-back-art" />
                {selected ? <span className="selection-badge">{selected.selectedOrder}</span> : null}
              </button>
            );
          }) : null}
        </div>
        <p className="oracle-invitation">
          {phase === "ready" ? "引いたカードにもう一度触れると、山へ戻せます。" : " "}
        </p>
      </div>

      <div className="reveal-action">
        <p>
          {phase === "shuffling"
            ? "ここだ、と思ったところで"
            : phase === "cutting"
              ? "三つの山から、ひとつを"
              : phase !== "ready"
                ? "卓の上に、カードを広げています"
                : isComplete
                  ? "カードが揃いました。占い師に渡しましょう"
                  : `あと ${remaining} 枚、呼ばれる気がするカードを`}
        </p>
        <div className="reveal-buttons">
          {phase === "shuffling" ? (
            <button className="primary-button" type="button" disabled={!canStop} onClick={stopShuffle}>
              <span>ここで止める</span>
            </button>
          ) : phase === "cutting" ? null : (
            <>
              <button className="text-button" type="button" disabled={phase !== "ready"} onClick={onReshuffle}>混ぜ直す</button>
              <button className="primary-button" type="button" disabled={!isComplete} onClick={onReveal}>
                <span>このカードで占う</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
