import { useState } from "react";
import type { Orientation, TarotCard } from "../types/tarot";

const orientationLabel: Record<Orientation, string> = {
  upright: "正位置",
  reversed: "逆位置",
};

const suitLabel = {
  wands: "WANDS",
  cups: "CUPS",
  swords: "SWORDS",
  pentacles: "PENTACLES",
} as const;

const minorRankLabel: Record<number, string> = {
  1: "A",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
  10: "X",
  11: "PAGE",
  12: "KNIGHT",
  13: "QUEEN",
  14: "KING",
};

type CardViewProps = {
  card: TarotCard;
  orientation: Orientation;
};

export const CardView = ({ card, orientation }: CardViewProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const meaning = orientation === "upright" ? card.upright : card.reversed;
  const shouldShowImage = !imageFailed;
  const minorSuit = card.arcana === "minor" ? card.suit : null;
  const isMinor = minorSuit !== null;
  const rankLabel = minorRankLabel[card.number ?? 0] ?? "";

  return (
    <article className="tarot-card">
      <div className={`${orientation === "reversed" ? "card-face is-reversed" : "card-face"}${isMinor ? " minor-card-face" : ""}`}>
        <div className="card-face-content">
          {shouldShowImage ? (
            <>
              <img src={card.imagePath} alt={`${card.nameJa}のカード画像`} onError={() => setImageFailed(true)} />
              {isMinor ? (
                <div className={`minor-rank-overlay ${minorSuit}${(card.number ?? 0) > 10 ? " is-court" : ""}`} aria-hidden="true">
                  <div className="minor-corner minor-corner-top">
                    <strong>{rankLabel}</strong>
                    <span>{suitLabel[minorSuit]}</span>
                  </div>
                  <div className="minor-rank-center">
                    <span>{rankLabel}</span>
                  </div>
                  <div className="minor-corner minor-corner-bottom">
                    <strong>{rankLabel}</strong>
                    <span>{suitLabel[minorSuit]}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className={`fallback-card ${card.suit ?? "major"}`}>
              <span>{card.arcana === "major" ? "Major" : suitLabel[card.suit ?? "wands"]}</span>
              <strong>{card.nameJa}</strong>
              <small>{card.nameEn}</small>
              <em>{meaning.keywords.slice(0, 3).join(" / ")}</em>
            </div>
          )}
        </div>
      </div>
      <div className="card-meta">
        <p className="card-number">
          {card.arcana === "major" ? String(card.number ?? 0).padStart(2, "0") : card.suit?.slice(0, 1).toUpperCase()}
        </p>
        <h3>{card.nameJa}</h3>
        <p>
          {card.nameEn} / {orientationLabel[orientation]}
        </p>
      </div>
    </article>
  );
};
