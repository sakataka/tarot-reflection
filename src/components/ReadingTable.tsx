import { useState, type CSSProperties } from "react";
import type { Reading, ReadingCard } from "../types/tarot";
import { moonPhase } from "../utils/moment";
import { tableCards } from "../utils/tarot";

export const orientationLabel = {
  upright: "正位置",
  reversed: "逆位置",
} as const;

const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];

// めくる順の番号を、卓の上での呼び名にする。スプレッドの札はローマ数字、山の底は月。
export const cardMark = (reading: Reading, cardIndex: number) =>
  cardIndex < reading.cards.length ? romanNumerals[cardIndex] : "☾";

export const narrationCardId = (cardIndex: number) => `narration-card-${cardIndex + 1}`;

type TableStripProps = {
  reading: Reading;
  revealed: boolean[];
  // いま占い師が語っているカード（めくる順の番号）。
  current?: number | null;
};

const StripCard = ({ readingCard, mark, isRevealed, isCurrent, targetId, order }: {
  readingCard: ReadingCard;
  mark: string;
  isRevealed: boolean;
  isCurrent: boolean;
  targetId?: string;
  // 卓に置かれた順。帯に並ぶとき、この順に一枚ずつ配られる。
  order: number;
}) => {
  const className = `strip-card${isRevealed ? " is-revealed" : ""}${isCurrent ? " is-current" : ""}`;
  const label = `${mark}・${readingCard.position.name}${isRevealed ? `：${readingCard.card.nameJa}（${orientationLabel[readingCard.orientation]}）` : "（まだ伏せたまま）"}`;
  const content = (
    <>
      <span className="strip-card-flip" aria-hidden="true">
        <span className="strip-card-back" />
        <img className={readingCard.orientation === "reversed" ? "is-reversed" : undefined} src={readingCard.card.imagePath} alt="" />
      </span>
      <small aria-hidden="true">{mark}</small>
      <span className="strip-card-name" aria-hidden="true">{readingCard.position.name}</span>
    </>
  );
  // 表になったカードは、語りのその場所へ飛べる。
  return isRevealed && targetId ? (
    <a
      className={className}
      style={{ "--i": order } as CSSProperties}
      href={`#${targetId}`}
      aria-label={label}
      aria-current={isCurrent ? "step" : undefined}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {content}
    </a>
  ) : (
    <span className={className} style={{ "--i": order } as CSSProperties} role="img" aria-label={label}>{content}</span>
  );
};

// これより長い問いは、はじめ数行だけ見せて畳んでおく。
const foldQuestionAt = 140;

export const ReadingHeading = ({ reading }: { reading: Reading }) => {
  const createdAt = new Date(reading.createdAt);
  const moon = moonPhase(createdAt);
  const isLong = reading.question.length > foldQuestionAt;
  const [open, setOpen] = useState(false);
  return (
    <section className="reading-heading">
      <p className="ornament-kicker">あなたの問い</p>
      <p className={isLong && !open ? "reading-question is-folded" : "reading-question"}>{reading.question}</p>
      {isLong ? (
        <button className="text-button reading-question-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "問いを畳む" : "問いを全部読む"}
        </button>
      ) : null}
      <p className="reading-date">
        {createdAt.toLocaleString("ja-JP", { dateStyle: "long", timeStyle: "short" })}
        ・{moon.glyph} {moon.name}・{reading.spread.name}
      </p>
    </section>
  );
};

// 卓の上を小さく見渡す帯。どのカードが表になり、いまどれを語っているかを示す。語りの間も上に留まる。
export const TableStrip = ({ reading, revealed, current = null }: TableStripProps) => (
  <nav className={`table-strip spread-${reading.cards.length}`} aria-label="卓の上のカード">
    {tableCards(reading).map((readingCard, index) => (
      <StripCard
        key={readingCard.position.id}
        readingCard={readingCard}
        mark={cardMark(reading, index)}
        isRevealed={revealed[index] ?? false}
        isCurrent={current === index}
        targetId={narrationCardId(index)}
        order={index}
      />
    ))}
    {reading.jumper ? (
      <StripCard readingCard={reading.jumper} mark="✦" isRevealed isCurrent={false} order={tableCards(reading).length} />
    ) : null}
  </nav>
);
