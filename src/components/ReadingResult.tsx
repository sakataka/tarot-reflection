import type { Reading } from "../types/tarot";
import { CardView } from "./CardView";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

type ReadingResultProps = {
  reading: Reading;
};

export const ReadingResult = ({ reading }: ReadingResultProps) => (
  <section className="panel">
    <div className="section-heading">
      <div>
        <p className="app-kicker">Cards revealed</p>
        <h2>開かれたカード</h2>
      </div>
      <p>{new Date(reading.createdAt).toLocaleString("ja-JP")}</p>
    </div>

    <div className="reading-grid">
      {reading.cards.map((readingCard) => {
        const meaning =
          readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;

        return (
          <div className="reading-card" key={readingCard.position.id}>
            <div className="position-copy">
              <p className="position-name">{readingCard.position.name}</p>
              <p>{readingCard.position.role}</p>
            </div>
            <CardView card={readingCard.card} orientation={readingCard.orientation} />
            <div className="meaning-copy">
              <p className="orientation">{orientationLabel[readingCard.orientation]}</p>
              <p className="keyword-list">{meaning.keywords.join(" / ")}</p>
              <p>{meaning.shortMeaning}</p>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
