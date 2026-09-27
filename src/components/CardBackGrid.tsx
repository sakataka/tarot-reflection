import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { DrawnCard, SelectedCard } from "../types/tarot";
import { oracleName } from "../utils/persona";
import { playDeal, playPick, playPlace, playShuffle } from "../utils/sound";
import { cutPileCount } from "../utils/tarot";
import { CardView } from "./CardView";
import { OraclePortrait } from "./OraclePortrait";

// 混ぜる → 手を止めて揃える → 上から三つに切り分ける → 一つ選ぶ → 選んだ山を最後に上へ重ねる → 広げる → 引く
type Phase = "shuffling" | "squaring" | "cutting" | "choosing" | "lifting" | "gathering" | "dealing" | "ready";

const shuffleLoop = 2100;
const stopAvailableAfter = 900;
const squareDuration = 650;
// 上の山から順に、一つずつ切り分けていく間隔。
const cutStagger = 420;
const cutDuration = cutStagger * (cutPileCount - 1) + 650;
const liftDuration = 600;
// 残りの山を先に重ね、選んだ山をいちばん最後に上へ載せる。
const gatherStagger = 480;
const gatherDuration = gatherStagger + 700;
const dealStagger = 9;
const dealDuration = 700;
const riffleCards = 12;

type CardBackGridProps = {
  cards: DrawnCard[];
  jumper: DrawnCard | null;
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

// 切り分けた山の置き場所。いちばん上の山を左へ、次を右へ運び、残りは中央に残る。
const pileSlots = [-1, 1, 0];
const slotNames: Record<number, string> = { [-1]: "左の山", 0: "中央の山", 1: "右の山" };

// 手のひらで扱う山は、卓に広げたカードより少し大きく見せる。
const computePileLayout = (width: number, layout: FanLayout): PileLayout => {
  const scale = layout.cardWidth < 60 ? 1.5 : 1.2;
  const gap = Math.min(width / 3.1, layout.cardWidth * scale * 2.2);
  return {
    scale,
    positions: Array.from({ length: cutPileCount }, (_, index) => ({
      x: layout.stack.x + pileSlots[index] * gap,
      y: layout.stack.y,
    })),
  };
};

export const CardBackGrid = ({
  cards,
  jumper,
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
  const [chosenPile, setChosenPile] = useState<number | null>(null);
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
    if (phase === "squaring") {
      const timer = window.setTimeout(() => setPhase("cutting"), squareDuration);
      return () => window.clearTimeout(timer);
    }
    if (phase === "cutting") {
      // 一山ずつ置くたびに、カードの擦れる音を小さく鳴らす。
      const timers = Array.from({ length: cutPileCount - 1 }, (_, index) => window.setTimeout(playPlace, index * cutStagger + 350));
      timers.push(window.setTimeout(() => setPhase("choosing"), cutDuration));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    if (phase === "lifting" && chosenPile !== null) {
      const timer = window.setTimeout(() => {
        onCut(chosenPile);
        setPhase("gathering");
      }, liftDuration);
      return () => window.clearTimeout(timer);
    }
    if (phase === "gathering") {
      const timers = [
        window.setTimeout(playPlace, gatherStagger + 300),
        window.setTimeout(() => setPhase("dealing"), gatherDuration),
      ];
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    if (phase === "dealing") {
      playDeal();
      const timer = window.setTimeout(() => setPhase("ready"), cards.length * dealStagger + dealDuration);
      return () => window.clearTimeout(timer);
    }
    // onCut は親の描画ごとに作り直されるので、依存に入れない。
  }, [phase, cards.length, chosenPile]);

  const stopShuffle = () => {
    if (!canStop || phase !== "shuffling") return;
    playPlace();
    onStopShuffle();
    setPhase("squaring");
  };

  const choosePile = (pileIndex: number) => {
    if (phase !== "choosing") return;
    playPick();
    setChosenPile(pileIndex);
    setPhase("lifting");
  };

  const layout = width > 0 ? computeFanLayout(width, cards.length) : null;
  const piles = layout ? computePileLayout(width, layout) : null;
  const pileSize = Math.ceil(cards.length / cutPileCount);
  const isSpread = phase === "dealing" || phase === "ready";
  const isSplit = phase === "cutting" || phase === "choosing" || phase === "lifting";
  // 集めるときは、選んだ山（並べ替え後の先頭）を最後に載せる。
  const chosenSize = chosenPile === null ? 0 : Math.min(pileSize, cards.length - chosenPile * pileSize);

  const cardTransform = (index: number): { transform: string; zIndex: number; delay: number } => {
    if (!layout || !piles) return { transform: "", zIndex: index, delay: 0 };
    if (isSpread) {
      const target = layout.positions[index];
      return { transform: `translate(${target.x}px, ${target.y}px) rotate(${target.angle}deg)`, zIndex: index, delay: phase === "dealing" ? index * dealStagger : 0 };
    }
    if (isSplit) {
      const pile = Math.floor(index / pileSize);
      const depth = pileSize - (index - pile * pileSize);
      const target = piles.positions[pile];
      const lifted = phase === "lifting" && pile === chosenPile;
      return {
        transform: `translate(${target.x}px, ${target.y - depth * 0.35 - (lifted ? 26 : 0)}px) scale(${piles.scale * (lifted ? 1.06 : 1)})`,
        // 上の山ほど先に持ち上げて運ぶ。運んでいる山は、残りの山より上を通る。
        zIndex: (cutPileCount - pile) * 1000 + depth,
        delay: phase === "cutting" ? pile * cutStagger : 0,
      };
    }
    // 混ぜている間と集めている間は一つの山。先頭（選んだ山）が一番上に来る。
    const depth = cards.length - index;
    const isChosen = phase === "gathering" && index < chosenSize;
    return {
      transform: `translate(${layout.stack.x}px, ${layout.stack.y - depth * 0.12}px) scale(${phase === "gathering" || phase === "squaring" ? piles.scale : 1})`,
      zIndex: depth,
      delay: isChosen ? gatherStagger : 0,
    };
  };

  const kicker = phase === "shuffling" || phase === "squaring" ? "Shuffle" : isSplit || phase === "gathering" ? "Cut" : "Draw";
  const oracleWords = {
    shuffling: "問いを胸の中で唱えながら、見ていてください。ここだ、と感じたら、山に触れて止めなさい。",
    squaring: jumper ? "……止めましたね。あら、一枚こぼれた。それは脇に置いておきましょう。" : "……止めましたね。では、揃えます。",
    cutting: "三つに切り分けます。",
    choosing: "心が向く山を、ひとつ選びなさい。その山が、いちばん上に来ます。",
    lifting: "その山ですね。",
    gathering: "残りを重ねて、あなたの山を上に。……広げますよ。",
    dealing: "残りを重ねて、あなたの山を上に。……広げますよ。",
    ready: isComplete
      ? "揃いましたね。そのカードを、わたしに渡してください。"
      : `目が止まったカード、指が呼ばれたカードに触れて。あと${remaining}枚。`,
  }[phase];

  return (
    <section className={`table-panel is-${phase}`}>
      <div className="section-heading">
        <div className="oracle-guide">
          <OraclePortrait pose="reading" size="small" />
          <div>
            <p className="ornament-kicker">{kicker}</p>
            <p className="oracle-guide-words" key={phase === "ready" ? `ready-${remaining}` : phase} aria-live="polite">{oracleWords}</p>
          </div>
        </div>
        <div className="selection-counter" aria-live="polite">
          <strong>{selectedCards.length}</strong>
          <span>/ {requiredCount} 枚</span>
        </div>
      </div>

      {jumper && phase !== "shuffling" && phase !== "squaring" ? (
        <div className="jumper-note" role="note">
          <div className="jumper-card">
            <CardView card={jumper.card} orientation={jumper.orientation} />
          </div>
          <p>
            <strong>混ぜている途中で、一枚が卓にこぼれました。</strong>
            <span>{jumper.card.nameJa}（{jumper.orientation === "upright" ? "正位置" : "逆位置"}）。自分から出てきたカードは、見落とさないでほしい知らせとして、脇に置いておきます。</span>
          </p>
        </div>
      ) : null}

      <div className="tarot-table">
        <div
          className="card-field"
          ref={fieldRef}
          aria-label="卓に広げた裏向きのカード"
          style={layout ? { height: layout.height, "--card-w": `${layout.cardWidth}px`, "--card-h": `${layout.cardHeight}px` } as CSSProperties : undefined}
        >
          {layout && phase === "shuffling" ? (
            <button
              className="riffle"
              type="button"
              disabled={!canStop}
              aria-label="ここでカードを混ぜる手を止める"
              onClick={stopShuffle}
              style={{ left: layout.stack.x, top: layout.stack.y }}
            >
              {Array.from({ length: riffleCards }, (_, index) => (
                <span
                  className={index % 2 === 0 ? "riffle-card is-left" : "riffle-card is-right"}
                  key={index}
                  style={{ "--i": Math.floor(index / 2) } as CSSProperties}
                />
              ))}
            </button>
          ) : null}

          {layout && piles && (phase === "choosing" || phase === "lifting") ? piles.positions.map((position, pileIndex) => (
            <button
              className={`cut-pile${chosenPile === pileIndex ? " is-chosen" : chosenPile !== null ? " is-passed" : ""}`}
              key={pileIndex}
              type="button"
              disabled={phase !== "choosing"}
              aria-label={`${slotNames[pileSlots[pileIndex]]}を選ぶ`}
              onClick={() => choosePile(pileIndex)}
              style={{
                left: position.x + (layout.cardWidth * (1 - piles.scale)) / 2,
                top: position.y + layout.cardHeight * (1 - piles.scale) - 12,
                width: layout.cardWidth * piles.scale,
                height: layout.cardHeight * piles.scale + 12,
              }}
            >
              <span>{slotNames[pileSlots[pileIndex]]}</span>
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
                  transitionDelay: `${placement.delay}ms`,
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
            ? "ここだ、と思ったところで山に触れるか"
            : phase === "choosing"
              ? "三つの山から、ひとつを選んでください"
              : phase !== "ready"
                ? " "
                : isComplete
                  ? `カードが揃いました。${oracleName}に渡しましょう`
                  : `あと ${remaining} 枚、呼ばれる気がするカードを`}
        </p>
        <div className="reveal-buttons">
          {phase === "shuffling" ? (
            <button className="primary-button" type="button" disabled={!canStop} onClick={stopShuffle}>
              <span>ここで止める</span>
            </button>
          ) : phase !== "ready" && phase !== "dealing" ? null : (
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
