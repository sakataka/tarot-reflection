import { useState } from "react";
import type { Orientation, TarotCard } from "../types/tarot";

const orientationLabel: Record<Orientation, string> = {
  upright: "正位置",
  reversed: "逆位置",
};

const suitLabel = {
  wands: "W",
  cups: "C",
  swords: "S",
  pentacles: "P",
} as const;

type CardViewProps = {
  card: TarotCard;
  orientation: Orientation;
};

export const CardView = ({ card, orientation }: CardViewProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const meaning = orientation === "upright" ? card.upright : card.reversed;
  const shouldShowImage = !imageFailed;

  return (
    <article className="tarot-card">
      <div className={orientation === "reversed" ? "card-face is-reversed" : "card-face"}>
        {shouldShowImage ? (
          <img src={card.imagePath} alt={`${card.nameJa}のカード画像`} onError={() => setImageFailed(true)} />
        ) : (
          <div className={`fallback-card ${card.suit ?? "major"}`}>
            <span>{card.arcana === "major" ? "Major" : suitLabel[card.suit ?? "wands"]}</span>
            <strong>{card.nameJa}</strong>
            <small>{card.nameEn}</small>
            <em>{meaning.keywords.slice(0, 3).join(" / ")}</em>
          </div>
        )}
      </div>
      <div className="card-meta">
        <h3>{card.nameJa}</h3>
        <p>
          {card.nameEn} / {orientationLabel[orientation]}
        </p>
      </div>
    </article>
  );
};
