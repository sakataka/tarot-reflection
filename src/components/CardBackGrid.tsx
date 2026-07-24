import type { CSSProperties } from "react";
import type { DrawnCard, SelectedCard } from "../types/tarot";

type CardBackGridProps = {
  cards: DrawnCard[];
  selectedCards: SelectedCard[];
  requiredCount: number;
  onToggleCard: (drawnCard: DrawnCard) => void;
  onReveal: () => void;
};

export const CardBackGrid = ({
  cards,
  selectedCards,
  requiredCount,
  onToggleCard,
  onReveal,
}: CardBackGridProps) => {
  const selectedById = new Map(selectedCards.map((selectedCard) => [selectedCard.card.id, selectedCard]));
  const isComplete = selectedCards.length === requiredCount;

  return (
    <section className="table-panel">
      <div className="section-heading">
        <div>
          <p className="section-number">02</p>
          <h1>心が惹かれるカードを選ぶ</h1>
          <p>考えすぎず、最初に目が留まったカードへ手を伸ばしてください。</p>
        </div>
        <div className="selection-counter" aria-live="polite">
          <strong>{selectedCards.length}</strong>
          <span>/ {requiredCount} 枚</span>
        </div>
      </div>

      <div className="tarot-table">
        <div className="table-orbit table-orbit-one" />
        <div className="table-orbit table-orbit-two" />
        <div className="card-rail" aria-label="裏向きカード一覧">
          {cards.map((drawnCard, index) => {
            const selected = selectedById.get(drawnCard.card.id);
            const disabled = !selected && selectedCards.length >= requiredCount;
            const centerOffset = index - (cards.length - 1) / 2;
            const style = {
              "--card-tilt": `${Math.max(-7, Math.min(7, centerOffset * 0.2))}deg`,
            } as CSSProperties;

            return (
              <button
                className={selected ? "card-back is-selected" : "card-back"}
                key={drawnCard.card.id}
                type="button"
                disabled={disabled}
                aria-label={`${index + 1}番目の裏向きカード${selected ? `、${selected.selectedOrder}枚目として選択中` : ""}`}
                aria-pressed={Boolean(selected)}
                style={style}
                onClick={() => onToggleCard(drawnCard)}
              >
                <span className="card-back-art" />
                {selected ? <span className="selection-badge">{selected.selectedOrder}</span> : null}
              </button>
            );
          })}
        </div>
        <p className="rail-hint">横に動かして、すべてのカードを見渡せます</p>
      </div>

      <div className="reveal-action">
        <p>{isComplete ? "カードが揃いました" : `あと ${requiredCount - selectedCards.length} 枚選んでください`}</p>
        <button className="primary-button" type="button" disabled={!isComplete} onClick={onReveal}>
          <span>カードを開く</span>
          <span aria-hidden="true">✦</span>
        </button>
      </div>
    </section>
  );
};
