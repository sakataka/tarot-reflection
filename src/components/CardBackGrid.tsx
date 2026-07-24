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
        <div className="oracle-invitation">
          <p>占い師が、あなたの前にカードを広げました</p>
          <span aria-hidden="true">✦</span>
        </div>
        <div className="card-field" aria-label="裏向きカード一覧">
          {cards.map((drawnCard, index) => {
            const selected = selectedById.get(drawnCard.card.id);
            const disabled = !selected && selectedCards.length >= requiredCount;
            const column = index % 13;
            const style = {
              "--card-tilt": `${(column - 6) * 0.45}deg`,
              "--card-delay": `${index * 7}ms`,
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
