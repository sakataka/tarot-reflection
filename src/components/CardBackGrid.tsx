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
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="app-kicker">Choose cards</p>
          <h2>裏向きカードから選ぶ</h2>
        </div>
        <p>
          {selectedCards.length} / {requiredCount} 枚選択済み
        </p>
      </div>

      <div className="card-back-grid" aria-label="裏向きカード一覧">
        {cards.map((drawnCard, index) => {
          const selected = selectedById.get(drawnCard.card.id);
          const disabled = !selected && selectedCards.length >= requiredCount;

          return (
            <button
              className={selected ? "card-back is-selected" : "card-back"}
              key={drawnCard.card.id}
              type="button"
              disabled={disabled}
              aria-label={`${index + 1}番目の裏向きカード`}
              onClick={() => onToggleCard(drawnCard)}
            >
              <span className="card-back-symbol">✦</span>
              {selected ? <span className="selection-badge">{selected.selectedOrder}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="actions">
        <button className="primary-button" type="button" disabled={!isComplete} onClick={onReveal}>
          結果を見る
        </button>
      </div>
    </section>
  );
};
