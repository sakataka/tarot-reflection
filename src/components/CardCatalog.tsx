import { useDeferredValue, useMemo, useState } from "react";
import { tarotDeck } from "../data/tarotDeck";
import type { Suit, TarotCard } from "../types/tarot";
import { CardView } from "./CardView";

type CatalogFilter = "all" | "major" | Suit;

const filters: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "major", label: "大アルカナ" },
  { id: "wands", label: "ワンド" },
  { id: "cups", label: "カップ" },
  { id: "swords", label: "ソード" },
  { id: "pentacles", label: "ペンタクル" },
];

const arcanaLabel = (card: TarotCard) =>
  card.arcana === "major"
    ? `大アルカナ ${String(card.number ?? 0).padStart(2, "0")}`
    : filters.find((filter) => filter.id === card.suit)?.label ?? "小アルカナ";

type CardCatalogProps = {
  onClose: () => void;
};

export const CardCatalog = ({ onClose }: CardCatalogProps) => {
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState(tarotDeck[0].id);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ja"));

  const visibleCards = useMemo(
    () => tarotDeck.filter((card) => {
      const matchesFilter = filter === "all"
        || (filter === "major" ? card.arcana === "major" : card.suit === filter);
      const matchesQuery = !deferredQuery
        || `${card.nameJa} ${card.nameEn} ${card.upright.keywords.join(" ")} ${card.reversed.keywords.join(" ")}`
          .toLocaleLowerCase("ja")
          .includes(deferredQuery);
      return matchesFilter && matchesQuery;
    }),
    [deferredQuery, filter],
  );

  const selectedCard = visibleCards.find((card) => card.id === selectedCardId)
    ?? visibleCards[0]
    ?? tarotDeck.find((card) => card.id === selectedCardId)
    ?? tarotDeck[0];

  return (
    <section className="catalog-panel" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <h1 id="catalog-title">カード図鑑</h1>
          <p>78枚のカードと、正位置・逆位置それぞれの基本的な意味を見られます。</p>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>占いに戻る</button>
      </div>

      <div className="catalog-controls">
        <div className="catalog-filters" role="group" aria-label="カードの種類で絞り込む">
          {filters.map((item) => (
            <button
              className={filter === item.id ? "catalog-filter is-active" : "catalog-filter"}
              type="button"
              aria-pressed={filter === item.id}
              key={item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="catalog-search">
          <span>カードを検索</span>
          <input
            type="search"
            value={query}
            placeholder="名前・キーワード"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="catalog-layout">
        <div className="catalog-list-region">
          <p className="catalog-count">{visibleCards.length}枚を表示</p>
          {visibleCards.length > 0 ? (
            <div className="catalog-grid">
              {visibleCards.map((card) => (
                <button
                  className={card.id === selectedCard.id ? "catalog-tile is-selected" : "catalog-tile"}
                  type="button"
                  aria-pressed={card.id === selectedCard.id}
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <img src={card.imagePath} alt="" loading="lazy" />
                  <span>
                    <strong>{card.nameJa}</strong>
                    <small>{card.nameEn}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="catalog-empty">該当するカードがありません。検索語を変えてみてください。</p>
          )}
        </div>

        <aside className="catalog-detail" aria-live="polite">
          <p className="catalog-kicker">{arcanaLabel(selectedCard)}</p>
          <CardView card={selectedCard} orientation="upright" />
          <div className="catalog-meanings">
            <section>
              <h2>正位置</h2>
              <p className="catalog-keywords">{selectedCard.upright.keywords.join(" / ")}</p>
              <p>{selectedCard.upright.shortMeaning}</p>
            </section>
            <section>
              <h2>逆位置</h2>
              <p className="catalog-keywords">{selectedCard.reversed.keywords.join(" / ")}</p>
              <p>{selectedCard.reversed.shortMeaning}</p>
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
};
