import type { Reading, ReadingCard } from "../types/tarot";
import { moonPhase } from "../utils/moment";
import { CardView } from "./CardView";

const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];

type ReadingResultProps = {
  reading: Reading;
  revealed: boolean[];
  onRevealAll?: () => void;
};

const TableCard = ({ readingCard, label, isRevealed, extra = false }: {
  readingCard: ReadingCard;
  label: string;
  isRevealed: boolean;
  extra?: boolean;
}) => {
  const meaning = readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;
  return (
    <article className={`reading-card${isRevealed ? " is-revealed" : ""}${extra ? " is-extra" : ""}`}>
      <div className="position-copy">
        <p className="position-index">{label}</p>
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
};

export const ReadingResult = ({ reading, revealed, onRevealAll }: ReadingResultProps) => {
  const createdAt = new Date(reading.createdAt);
  const moon = moonPhase(createdAt);

  return (
    <section className="reading-panel">
      <div className="reading-heading">
        <p className="ornament-kicker">あなたの問い</p>
        <p className="reading-question">{reading.question}</p>
        <h1>カードが映す、今のあなた</h1>
        <p className="reading-date">
          {createdAt.toLocaleString("ja-JP", { dateStyle: "long", timeStyle: "short" })}
          ・{moon.glyph} {moon.name}・{reading.spread.name}
        </p>
      </div>

      <div className={`reading-grid spread-${reading.cards.length}`}>
        {reading.cards.map((readingCard, index) => (
          <TableCard
            key={readingCard.position.id}
            readingCard={readingCard}
            label={romanNumerals[index]}
            isRevealed={revealed[index] ?? false}
          />
        ))}
      </div>

      {reading.jumper || reading.root ? (
        <div className="table-extras">
          {reading.jumper ? <TableCard readingCard={reading.jumper} label="✦" isRevealed extra /> : null}
          {reading.root ? (
            <TableCard readingCard={reading.root} label="☾" isRevealed={revealed[reading.cards.length] ?? false} extra />
          ) : null}
        </div>
      ) : null}

      {onRevealAll ? (
        <div className="reveal-skip">
          <button className="text-button" type="button" onClick={onRevealAll}>語りを待たずに、すべて表に返す</button>
        </div>
      ) : null}
    </section>
  );
};
