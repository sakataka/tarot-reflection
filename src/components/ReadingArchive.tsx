import { useState } from "react";
import { tarotDeck } from "../data/tarotDeck";
import { readingFromRecord, type ReadingRecord } from "../utils/history";
import { moonPhase } from "../utils/moment";
import { parseNarration } from "../utils/narration";
import { oracleName } from "../utils/persona";
import { tableCards } from "../utils/tarot";
import { ExchangeList } from "./FollowUpBox";
import { NarrationView } from "./NarrationView";
import { ReadingHeading, TableStrip } from "./ReadingTable";

type ReadingArchiveProps = {
  records: ReadingRecord[];
  selectedId: string | null;
  error: string;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

export const ReadingArchive = ({ records, selectedId, error, onSelect, onDelete }: ReadingArchiveProps) => {
  const selected = records.find((record) => record.id === selectedId);
  return selected ? (
    <ArchivedReading record={selected} onBack={() => onSelect(null)} onDelete={onDelete} />
  ) : (
    <section className="archive-panel">
      <div className="catalog-heading">
        <div>
          <p className="ornament-kicker">Records</p>
          <h1>これまでの夜</h1>
          <p>引いたカードと、{oracleName}の言葉が残っています。記録はこのMacの中にだけ置かれます。</p>
        </div>
      </div>

      {error ? <p className="copy-fallback" role="alert">{error}</p> : null}
      {records.length === 0 && !error ? <p className="catalog-empty">まだ記録はありません。語りを最後まで受け取ると、ここに残ります。</p> : null}

      <ol className="archive-list">
        {records.map((record) => {
          const moon = moonPhase(new Date(record.createdAt));
          const cards = record.cards
            .map((cardRecord) => ({ ...cardRecord, card: tarotDeck.find((card) => card.id === cardRecord.cardId) }))
            .filter((item) => item.card);
          return (
            <li key={record.id}>
              <button className="archive-item" type="button" onClick={() => onSelect(record.id)}>
                <span className="archive-date">{formatDate(record.createdAt)}・{moon.glyph} {moon.name}</span>
                <strong className="archive-question">{record.question}</strong>
                <span className="archive-cards" aria-label={cards.map((item) => item.card?.nameJa).join("、")}>
                  {cards.map((item) => (
                    <img
                      key={item.cardId}
                      className={item.orientation === "reversed" ? "is-reversed" : undefined}
                      src={item.card?.imagePath}
                      alt=""
                    />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const ArchivedReading = ({ record, onBack, onDelete }: {
  record: ReadingRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const reading = readingFromRecord(record);
  if (!reading) {
    return (
      <section className="archive-panel">
        <p className="copy-fallback">この記録は読み返せませんでした。</p>
        <button className="secondary-button" type="button" onClick={onBack}>記録の一覧へ</button>
      </section>
    );
  }

  const cardCount = tableCards(reading).length;
  const segments = parseNarration(record.narration, true, cardCount);

  return (
    <div className="archive-reading reading-stage">
      <div className="archive-toolbar">
        <button className="text-button" type="button" onClick={onBack}>← 記録の一覧へ</button>
      </div>
      <ReadingHeading reading={reading} />
      <TableStrip reading={reading} revealed={Array.from({ length: cardCount }, () => true)} />
      <section className="oracle-panel is-open">
        <div className="oracle-heading">
          <p className="ornament-kicker">{oracleName}の言葉</p>
          <h2>その夜、カードが告げたこと</h2>
        </div>
        {record.clarification ? (
          <div className="exchange is-clarify">
            <div className="exchange-answer"><span>{oracleName}</span><p>{record.clarification.question}</p></div>
            <p className="exchange-ask"><span>あなた</span>{record.clarification.answer}</p>
          </div>
        ) : null}
        <NarrationView reading={reading} segments={segments.map((segment) => ({ segment, text: segment.text }))} />
        {record.followUps?.length ? <ExchangeList exchanges={record.followUps} /> : null}
        <div className="archive-delete">
          {confirming ? (
            <>
              <p>この夜の記録を消します。元には戻せません。</p>
              <button className="text-button" type="button" onClick={() => setConfirming(false)}>やめる</button>
              <button className="secondary-button" type="button" onClick={() => onDelete(record.id)}>消す</button>
            </>
          ) : (
            <button className="text-button" type="button" onClick={() => setConfirming(true)}>この記録を消す</button>
          )}
        </div>
      </section>
    </div>
  );
};
