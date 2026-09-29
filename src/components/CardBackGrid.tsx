import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { DrawnCard, SelectedCard, SpreadPosition } from "../types/tarot";
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
// 山を持った手が弧をなぞり、一枚ずつ卓に置いていく。段ごとに向きを折り返す。
const dealLead = 320;
const dealStagger = 20;
const dealDuration = 360;
const riffleCards = 12;

type CardBackGridProps = {
  cards: DrawnCard[];
  jumper: DrawnCard | null;
  selectedCards: SelectedCard[];
  requiredCount: number;
  positions: SpreadPosition[];
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
  // 配る順番。段ごとに左から右、右から左と折り返す。
  dealOrder: number[];
  perRow: number;
  stack: { x: number; y: number };
  // 引いたカードを置く場所（並べ方の位置ごと）。広げたカードの下に並ぶ。
  slots: { x: number; y: number; width: number; height: number }[];
};

type PileLayout = {
  scale: number;
  positions: { x: number; y: number }[];
};

// 卓の幅に合わせて、78枚を数段の弧に広げる。後ろの段ほど奥に置き、手前の段が少し重なる。
const computeFanLayout = (width: number, count: number, slotCount: number): FanLayout => {
  const rows = width >= 900 ? 2 : width >= 600 ? 3 : 6;
  const perRow = Math.ceil(count / rows);
  const maxWidth = rows === 2 ? (width >= 1100 ? 108 : 90) : rows === 3 ? 70 : 52;
  const cardWidth = Math.round(Math.min(maxWidth, width / (rows === 6 ? 7.4 : rows === 2 ? 9.6 : 8)));
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
  const dealOrder = positions.map((_, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const column = index - row * perRow;
    return row * perRow + (row % 2 === 0 ? column : inRow - 1 - column);
  });

  const fanBottom = lift + (rows - 1) * rowGap + sag + cardHeight;
  // 置き場は、広げたカードより一回り大きく。枚数が多いときは卓の幅に収める。
  const slotGap = rows === 6 ? 8 : 18;
  const slotWidth = Math.floor(Math.min(cardWidth * (slotCount === 1 ? 1.4 : slotCount > 3 ? 1 : 1.15), (width - 16 - slotGap * (slotCount - 1)) / slotCount));
  const slotHeight = Math.round(slotWidth * 1.5);
  const rowWidth = slotWidth * slotCount + slotGap * (slotCount - 1);
  // 弧の中央は高く、両端ほど下がる。置き場の幅の下にある扇の底から少し離して置く。
  const edge = Math.min(1, (rowWidth / 2 + cardWidth / 2) / (span / 2));
  const slotTop = lift + (rows - 1) * rowGap + cardHeight + Math.round(sag * edge * edge) + (rows === 6 ? 28 : 36);
  const slots = Array.from({ length: slotCount }, (_, index) => {
    // 七枚は蹄鉄の形に、両端を少し下げる。
    const t = slotCount === 1 ? 0 : (index / (slotCount - 1)) * 2 - 1;
    const arch = slotCount >= 5 ? Math.round(t * t * slotHeight * 0.22) : 0;
    return { x: (width - rowWidth) / 2 + index * (slotWidth + slotGap), y: slotTop + arch, width: slotWidth, height: slotHeight };
  });
  const slotsBottom = slotTop + slotHeight + (slotCount >= 5 ? Math.round(slotHeight * 0.22) : 0) + 34;

  return {
    cardWidth,
    cardHeight,
    height: Math.max(fanBottom + 12, slotsBottom),
    positions,
    dealOrder,
    perRow,
    stack: { x: width / 2 - cardWidth / 2, y: lift + ((rows - 1) * rowGap + sag) / 2 },
    slots,
  };
};

// 置き場に載せるための transform。カードは下辺の中央を軸に拡大されるので、その分をずらす。
const slotTransform = (layout: FanLayout, slot: FanLayout["slots"][number]) => {
  const scale = slot.width / layout.cardWidth;
  const x = slot.x - layout.cardWidth / 2 + (layout.cardWidth * scale) / 2;
  const y = slot.y - layout.cardHeight + layout.cardHeight * scale;
  return `translate(${x}px, ${y}px) scale(${scale})`;
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
  positions,
  onStopShuffle,
  onCut,
  onToggleCard,
  onReveal,
  onReshuffle,
}: CardBackGridProps) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState<Phase>("shuffling");
  const [canStop, setCanStop] = useState(false);
  const [chosenPile, setChosenPile] = useState<number | null>(null);
  const selectedById = new Map(selectedCards.map((selectedCard) => [selectedCard.card.id, selectedCard]));
  const isComplete = selectedCards.length === requiredCount;
  const remaining = requiredCount - selectedCards.length;

  const layout = width > 0 ? computeFanLayout(width, cards.length, requiredCount) : null;
  const piles = layout ? computePileLayout(width, layout) : null;
  const dealTotal = dealLead + cards.length * dealStagger;

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
      // 段ごとに、手が卓を滑る音を鳴らす。
      const perRow = layout?.perRow ?? cards.length;
      const timers = Array.from({ length: Math.ceil(cards.length / perRow) }, (_, row) =>
        window.setTimeout(playDeal, dealLead + row * perRow * dealStagger));
      timers.push(window.setTimeout(() => setPhase("ready"), dealTotal + dealDuration));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    // onCut は親の描画ごとに作り直されるので、依存に入れない。
  }, [phase, cards.length, chosenPile]);

  // 配るあいだ、山を持った手が弧をなぞって動く。置いた順に、その場所へカードが残る。
  useLayoutEffect(() => {
    const deck = deckRef.current;
    if (phase !== "dealing" || !deck || !layout || !piles || typeof deck.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      deck.style.display = "none";
      return;
    }
    const byOrder = layout.dealOrder
      .map((order, index) => ({ order, position: layout.positions[index] }))
      .sort((a, b) => a.order - b.order);
    const place = ({ x, y, angle }: { x: number; y: number; angle: number }) => `translate(${x}px, ${y - 10}px) rotate(${angle}deg)`;
    const keyframes: Keyframe[] = [
      { transform: `translate(${layout.stack.x}px, ${layout.stack.y}px) scale(${piles.scale})`, opacity: 1, offset: 0 },
      ...byOrder.map(({ order, position }) => ({ transform: place(position), opacity: 1, offset: (dealLead + order * dealStagger) / (dealTotal + dealDuration) })),
      { transform: place(byOrder[byOrder.length - 1].position), opacity: 0, offset: 1 },
    ];
    const animation = deck.animate(keyframes, { duration: dealTotal + dealDuration, easing: "linear", fill: "forwards" });
    return () => animation.cancel();
    // レイアウトは幅から決まる。配っている途中に幅が変わったら、そこから配り直す。
  }, [phase, width]);

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

  const pileSize = Math.ceil(cards.length / cutPileCount);
  const isSpread = phase === "dealing" || phase === "ready";
  const isSplit = phase === "cutting" || phase === "choosing" || phase === "lifting";
  // 集めるときは、選んだ山（並べ替え後の先頭）を最後に載せる。
  const chosenSize = chosenPile === null ? 0 : Math.min(pileSize, cards.length - chosenPile * pileSize);

  const cardTransform = (index: number, selected?: SelectedCard): { transform: string; zIndex: number; delay: number } => {
    if (!layout || !piles) return { transform: "", zIndex: index, delay: 0 };
    if (isSpread) {
      const slot = selected ? layout.slots[selected.selectedOrder - 1] : undefined;
      if (slot) return { transform: slotTransform(layout, slot), zIndex: cards.length + selected!.selectedOrder, delay: 0 };
      const target = layout.positions[index];
      return {
        transform: `translate(${target.x}px, ${target.y}px) rotate(${target.angle}deg)`,
        zIndex: index,
        delay: phase === "dealing" ? dealLead + layout.dealOrder[index] * dealStagger : 0,
      };
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

          {/* 引いたカードの置き場。並べ方の位置の名前を卓に記しておく。 */}
          {layout ? layout.slots.map((slot, slotIndex) => (
            <div
              className={slotIndex < selectedCards.length ? "spread-slot is-filled" : slotIndex === selectedCards.length && phase === "ready" ? "spread-slot is-next" : "spread-slot"}
              key={positions[slotIndex]?.id ?? slotIndex}
              aria-hidden="true"
              style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height }}
            >
              <span>{positions[slotIndex]?.name}</span>
            </div>
          )) : null}

          {layout && phase === "dealing" ? (
            <div className="deal-deck" ref={deckRef} aria-hidden="true">
              <span /><span /><span />
            </div>
          ) : null}

          {layout ? cards.map((drawnCard, index) => {
            const selected = selectedById.get(drawnCard.card.id);
            const disabled = phase !== "ready" || (!selected && selectedCards.length >= requiredCount);
            const placement = cardTransform(index, selected);
            const position = selected ? positions[selected.selectedOrder - 1] : undefined;

            return (
              <button
                className={selected ? "card-back is-selected" : "card-back"}
                key={drawnCard.card.id}
                type="button"
                disabled={disabled}
                aria-label={`${index + 1}番目の裏向きカード${selected ? `、${position?.name ?? `${selected.selectedOrder}枚目`}に置いたカード` : ""}`}
                aria-pressed={Boolean(selected)}
                onClick={() => onToggleCard(drawnCard)}
                tabIndex={phase === "ready" ? undefined : -1}
                style={{
                  transform: placement.transform,
                  ...(phase === "dealing" ? { animationDelay: `${placement.delay}ms` } : { transitionDelay: `${placement.delay}ms` }),
                  zIndex: placement.zIndex,
                }}
              >
                <span className="card-back-art" />
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
