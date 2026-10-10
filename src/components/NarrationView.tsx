import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Reading, ReadingCard } from "../types/tarot";
import { answerLabel, moonPhase } from "../utils/moment";
import { splitParagraphs, type NarrationSegment } from "../utils/narration";
import { tableCards } from "../utils/tarot";
import { CardView } from "./CardView";
import { MoonGlyph } from "./MoonGlyph";
import { cardMark, narrationCardId, orientationLabel } from "./ReadingTable";
import { TiltCard } from "./TiltCard";

export type VisibleSegment = { segment: NarrationSegment; text: string };

type NarrationViewProps = {
  reading: Reading;
  segments: VisibleSegment[];
  // 語りの途中なら、最後の段落の末尾に筆先を灯す。
  speaking?: boolean;
  // 語りに合わせてめくる演出をするか（記録の読み返しでは最初から表）。
  animate?: boolean;
  // 札の意味（裏書き）を添えるか。カードを返すときから、開いた状態で添える。
  showNotes?: boolean;
  // 答えの枠の下に添えるもの（囁きを聴く、など）。
  messageSlot?: ReactNode;
  // 囁いている間は、答えの文字を伏せておく。
  messageHeld?: boolean;
};

// 卓から持ち上げたカードを、語りの頭で大きく見せる。語りと同時に表へ返す。
const CardStage = ({ readingCard, mark, animate, note, showNotes }: {
  readingCard: ReadingCard;
  mark: string;
  animate: boolean;
  note?: string;
  showNotes: boolean;
}) => {
  const [faceDown, setFaceDown] = useState(animate);
  const meaning = readingCard.orientation === "upright" ? readingCard.card.upright : readingCard.card.reversed;

  useEffect(() => {
    if (!faceDown) return;
    const timer = window.setTimeout(() => setFaceDown(false), 380);
    return () => window.clearTimeout(timer);
  }, [faceDown]);

  return (
    <div className={`card-stage${faceDown ? " is-face-down" : ""}${animate ? " is-animated" : ""}`}>
      <div className="card-stage-card">
        {animate ? (
          <span className="reveal-burst" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ "--a": `${index * 36 + 8}deg` } as CSSProperties} />)}
          </span>
        ) : null}
        <TiltCard>
          <CardView card={readingCard.card} orientation={readingCard.orientation} faceDown={faceDown} />
        </TiltCard>
      </div>
      <div className="card-stage-label" data-mark={mark}>
        <small>{mark}・{readingCard.position.name}</small>
        <span className="card-stage-role">{note ?? readingCard.position.role}</span>
        <strong>{readingCard.card.nameJa}</strong>
        <em>{orientationLabel[readingCard.orientation]}</em>
        {showNotes ? (
          <details className="card-notes" open>
            <summary>札の裏書き</summary>
            <p><span lang="en">{readingCard.card.nameEn}</span></p>
            <p className="card-stage-keywords">{meaning.keywords.join("・")}</p>
          </details>
        ) : null}
      </div>
    </div>
  );
};

// 総括の頭に、卓の全体をもう一度並べて見せる。
const TableOverview = ({ reading }: { reading: Reading }) => (
  <div className="table-overview" aria-hidden="true">
    {tableCards(reading).map((readingCard, index) => (
      <span className="table-overview-card" key={readingCard.position.id}>
        <img className={readingCard.orientation === "reversed" ? "is-reversed" : undefined} src={readingCard.card.imagePath} alt="" />
        <small>{cardMark(reading, index)}</small>
      </span>
    ))}
  </div>
);

export const NarrationView = ({ reading, segments, speaking = false, animate = false, showNotes = true, messageSlot, messageHeld = false }: NarrationViewProps) => {
  const flipped = tableCards(reading);
  const lastVisible = segments.length - 1;

  return (
    <div className="narration">
      {segments.map(({ segment, text }, segmentIndex) => {
        const paragraphs = splitParagraphs(text);
        const isLast = segmentIndex === lastVisible;
        const caret = speaking && isLast;
        const body = paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph}
            {caret && index === paragraphs.length - 1 ? <span className="ink-caret" aria-hidden="true" /> : null}
          </p>
        ));

        if (segment.kind === "recap") return null;
        if (segment.kind === "card") {
          return (
            <div className="narration-segment is-card" id={narrationCardId(segment.cardIndex)} key={`card-${segment.cardIndex}`}>
              <CardStage readingCard={flipped[segment.cardIndex]} mark={cardMark(reading, segment.cardIndex)} animate={animate} showNotes={showNotes} />
              {body}
            </div>
          );
        }
        if (segment.kind === "close") {
          return (
            <div className="narration-segment is-close" id="narration-close" key="close">
              <p className="narration-kicker">卓を見渡して</p>
              <TableOverview reading={reading} />
              {body}
            </div>
          );
        }
        if (segment.kind === "message") {
          return (
            <div className="narration-segment is-message" id="narration-message" key="message">
              <p className="narration-kicker">{answerLabel(new Date(reading.createdAt))}</p>
              <div className={messageHeld ? "message-words is-held" : "message-words"}>
                <MoonGlyph age={moonPhase(new Date(reading.createdAt)).age} className="message-emblem" />
                {messageHeld ? <p className="message-hush" aria-hidden="true"><i /><i /><i /></p> : body}
              </div>
              {messageSlot}
            </div>
          );
        }
        return (
          <div className="narration-segment is-intro" key="intro">
            {reading.jumper ? (
              <CardStage readingCard={reading.jumper} mark="✦" animate={false} note="混ぜている途中で、自分から出てきたカード" showNotes={showNotes} />
            ) : null}
            {body}
          </div>
        );
      })}
    </div>
  );
};
