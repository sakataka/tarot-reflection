import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { tarotDeck } from "../data/tarotDeck";
import type { Suit, TarotCard } from "../types/tarot";
import { CardView, minorRankLabel } from "./CardView";

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

// 狭い画面では、詳細を一覧の上ではなく下から出るシートで見せる。
const sheetQuery = "(max-width: 760px)";

export const CardCatalog = () => {
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState(tarotDeck[0].id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTileRef = useRef<HTMLButtonElement | null>(null);
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

  const closeSheet = () => {
    setSheetOpen(false);
    lastTileRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!sheetOpen) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <section className="catalog-panel" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <p className="ornament-kicker">Cards</p>
          <h1 id="catalog-title">カード図鑑</h1>
          <p>78枚のカードと、正位置・逆位置それぞれの基本的な意味。</p>
        </div>
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
          <p className="catalog-count">{visibleCards.length}枚</p>
          {visibleCards.length > 0 ? (
            <div className="catalog-grid">
              {visibleCards.map((card) => (
                <button
                  className={card.id === selectedCard.id ? "catalog-tile is-selected" : "catalog-tile"}
                  type="button"
                  aria-pressed={card.id === selectedCard.id}
                  key={card.id}
                  onClick={(event) => {
                    setSelectedCardId(card.id);
                    lastTileRef.current = event.currentTarget;
                    if (window.matchMedia?.(sheetQuery).matches) setSheetOpen(true);
                  }}
                >
                  <span className="catalog-tile-art">
                    <img src={card.imagePath} alt="" loading="lazy" />
                    {card.sharedArt ? <i aria-hidden="true">{minorRankLabel[card.number ?? 0]}</i> : null}
                  </span>
                  <span className="catalog-tile-name">
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

        <button className={sheetOpen ? "catalog-backdrop is-open" : "catalog-backdrop"} type="button" tabIndex={-1} aria-hidden="true" onClick={closeSheet} />
        <aside
          className={sheetOpen ? "catalog-detail is-open" : "catalog-detail"}
          aria-live="polite"
          aria-label={`${selectedCard.nameJa}の意味`}
        >
          <div className="catalog-detail-bar">
            <p className="catalog-kicker">{arcanaLabel(selectedCard)}</p>
            <button className="text-button catalog-close" type="button" ref={closeRef} onClick={closeSheet}>閉じる</button>
          </div>
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
