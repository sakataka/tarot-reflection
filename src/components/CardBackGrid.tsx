import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { DrawnCard, SelectedCard } from "../types/tarot";
import { playDeal, playShuffle } from "../utils/sound";

type Phase = "shuffling" | "dealing" | "ready";

const shuffleDuration = 2200;
const dealStagger = 9;
const dealDuration = 700;
const riffleCards = 12;

type CardBackGridProps = {
  cards: DrawnCard[];
  selectedCards: SelectedCard[];
  requiredCount: number;
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

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

export const CardBackGrid = ({
  cards,
  selectedCards,
  requiredCount,
  onToggleCard,
  onReveal,
  onReshuffle,
}: CardBackGridProps) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? "ready" : "shuffling"));
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
      playShuffle();
      const timer = window.setTimeout(() => setPhase("dealing"), shuffleDuration);
      return () => window.clearTimeout(timer);
    }
    if (phase === "dealing") {
      playDeal();
      const timer = window.setTimeout(() => setPhase("ready"), cards.length * dealStagger + dealDuration);
      return () => window.clearTimeout(timer);
    }
  }, [phase, cards.length]);

  const layout = width > 0 ? computeFanLayout(width, cards.length) : null;
  const isSpread = phase !== "shuffling";

  return (
    <section className={`table-panel is-${phase}`}>
      <div className="section-heading">
        <div>
          <p className="ornament-kicker">{phase === "shuffling" ? "Shuffle" : "Draw"}</p>
          <h1>{phase === "shuffling" ? "カードを混ぜています" : "カードを引く"}</h1>
          <p>
            {phase === "shuffling"
              ? "あなたの問いを、胸の中でもう一度つぶやいてください。"
              : "考えすぎなくて大丈夫。目が止まったカード、指が呼ばれたカードに触れてください。"}
          </p>
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

          {layout ? cards.map((drawnCard, index) => {
            const selected = selectedById.get(drawnCard.card.id);
            const disabled = phase !== "ready" || (!selected && selectedCards.length >= requiredCount);
            const target = isSpread ? layout.positions[index] : { ...layout.stack, angle: 0 };

            return (
              <button
                className={selected ? "card-back is-selected" : "card-back"}
                key={drawnCard.card.id}
                type="button"
                disabled={disabled}
                aria-label={`${index + 1}番目の裏向きカード${selected ? `、${selected.selectedOrder}枚目として選択中` : ""}`}
                aria-pressed={Boolean(selected)}
                onClick={() => onToggleCard(drawnCard)}
                style={{
                  transform: `translate(${target.x}px, ${target.y}px) rotate(${target.angle}deg)`,
                  transitionDelay: phase === "dealing" ? `${index * dealStagger}ms` : "0ms",
                  zIndex: selected ? cards.length + selected.selectedOrder : index,
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
          {phase !== "ready"
            ? "卓の上に、カードを広げています"
            : isComplete
              ? "カードが揃いました。表に返しましょう"
              : `あと ${remaining} 枚、呼ばれる気がするカードを`}
        </p>
        <div className="reveal-buttons">
          <button className="text-button" type="button" disabled={phase !== "ready"} onClick={onReshuffle}>混ぜ直す</button>
          <button className="primary-button" type="button" disabled={!isComplete} onClick={onReveal}>
            <span>カードをめくる</span>
          </button>
        </div>
      </div>
    </section>
  );
};
