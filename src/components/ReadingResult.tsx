import type { Reading } from "../types/tarot";
import { CardView } from "./CardView";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

type ReadingResultProps = {
  reading: Reading;
  revealedCount: number;
  onRevealAll?: () => void;
};

export const ReadingResult = ({ reading, revealedCount, onRevealAll }: ReadingResultProps) => (
  <section className="reading-panel">
    <div className="reading-heading">
      <p className="ornament-kicker">あなたの問い</p>
      <p className="reading-question">{reading.question}</p>
      <h1>カードが映す、今のあなた</h1>
      <p className="reading-date">
        {new Date(reading.createdAt).toLocaleString("ja-JP", { dateStyle: "long", timeStyle: "short" })}
        ・{reading.spread.name}
      </p>
    </div>

    <div className={`reading-grid spread-${reading.cards.length}`}>
      {reading.cards.map((readingCard, index) => {
        const meaning =
          readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;
        const isRevealed = index < revealedCount;

        return (
          <article
            className={isRevealed ? "reading-card is-revealed" : "reading-card"}
            key={readingCard.position.id}
            aria-live="polite"
          >
            <div className="position-copy">
              <p className="position-index">{["I", "II", "III", "IV", "V", "VI", "VII"][index]}</p>
              <p className="position-name">{readingCard.position.name}</p>
              <p>{readingCard.position.role}</p>
            </div>
            <CardView card={readingCard.card} orientation={readingCard.orientation} faceDown={!isRevealed} />
            <div className="meaning-copy" aria-hidden={!isRevealed}>
              <p className="orientation">{orientationLabel[readingCard.orientation]}</p>
              <p className="keyword-list">{meaning.keywords.join("・")}</p>
              <p>{meaning.shortMeaning}</p>
            </div>
          </article>
        );
      })}
    </div>

    {onRevealAll ? (
      <div className="reveal-skip">
        <button className="text-button" type="button" onClick={onRevealAll}>すべてのカードを表に返す</button>
      </div>
    ) : null}
  </section>
);
