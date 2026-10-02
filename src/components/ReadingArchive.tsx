import { useEffect, useRef, useState } from "react";
import { tarotDeck } from "../data/tarotDeck";
import { readingFromRecord, type ReadingRecord } from "../utils/history";
import { moonPhase } from "../utils/moment";
import { parseNarration } from "../utils/narration";
import { oracleName } from "../utils/persona";
import { tableCards } from "../utils/tarot";
import { ExchangeList } from "./FollowUpBox";
import { MoonGlyph } from "./MoonGlyph";
import { NarrationView } from "./NarrationView";
import { ReadingHeading, TableStrip } from "./ReadingTable";

type ReadingArchiveProps = {
  records: ReadingRecord[];
  selectedId: string | null;
  error: string;
  // 記録を消したあと、一覧の先頭にしばらく出す知らせ。
  notice: string;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => Promise<void>;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

export const ReadingArchive = ({ records, selectedId, error, notice, onSelect, onDelete }: ReadingArchiveProps) => {
  const selected = records.find((record) => record.id === selectedId);
  // 一覧が浮かび上がる動きは最初の一度だけ。記録から戻ったときは、そのまま見せる。
  const listShown = useRef(false);
  const settled = listShown.current;
  useEffect(() => {
    if (!selected) listShown.current = true;
  });
  return selected ? (
    <ArchivedReading record={selected} onBack={() => onSelect(null)} onDelete={onDelete} />
  ) : (
    <section className={settled ? "archive-panel is-settled" : "archive-panel"}>
      <div className="catalog-heading">
        <div>
          <p className="ornament-kicker">Records</p>
          <h1>これまでの夜</h1>
          <p>引いたカードと、{oracleName}の言葉が残っています。記録はこのMacの中にだけ置かれます。</p>
        </div>
      </div>

      {notice ? <p className="archive-notice" role="status">{notice}</p> : null}
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
                <span className="archive-date">{formatDate(record.createdAt)}・<MoonGlyph age={moon.age} className="inline-moon" />{moon.name}</span>
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
  onDelete: (id: string) => Promise<void>;
}) => {
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
        <DeleteRecord record={record} onDelete={onDelete} />
      </section>
    </div>
  );
};

type DeleteState = "idle" | "confirming" | "deleting" | "failed";

// 記録を消す。確かめる欄を開き、消している間はもう押せないようにし、失敗したらその場でやり直せる。
const DeleteRecord = ({ record, onDelete }: { record: ReadingRecord; onDelete: (id: string) => Promise<void> }) => {
  const [state, setState] = useState<DeleteState>("idle");
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const isOpen = state !== "idle";

  useEffect(() => {
    if (state !== "confirming") return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    cancelRef.current?.focus({ preventScroll: true });
  }, [state]);

  const cancel = () => {
    setState("idle");
    window.requestAnimationFrame(() => openerRef.current?.focus({ preventScroll: true }));
  };

  // 描画を待たずに続けて押されても、一度だけ送る。
  const busyRef = useRef(false);
  const confirm = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState("deleting");
    // 消せたら一覧へ移るので、この欄はそのまま閉じられる。
    onDelete(record.id).catch(() => {
      busyRef.current = false;
      setState("failed");
    });
  };

  return (
    <div className="archive-delete">
      {isOpen ? (
        <div
          className="archive-delete-confirm"
          ref={panelRef}
          role="group"
          aria-label="記録を消すかの確認"
          onKeyDown={(event) => {
            if (event.key === "Escape" && state !== "deleting") cancel();
          }}
        >
          <p className="archive-delete-title">この夜の記録を消しますか</p>
          <p className="archive-delete-question">{record.question}</p>
          <p className="archive-delete-note">カードと{oracleName}の言葉、聞き返しも消えます。元には戻せません。</p>
          {state === "failed" ? (
            <p className="copy-fallback" role="alert">消せませんでした。サーバーが起動しているか確かめて、もう一度お試しください。</p>
          ) : null}
          <div className="archive-delete-actions">
            <button className="danger-button" type="button" disabled={state === "deleting"} onClick={confirm}>
              {state === "deleting" ? "消しています…" : state === "failed" ? "もう一度消す" : "消す"}
            </button>
            <button className="text-button" type="button" ref={cancelRef} disabled={state === "deleting"} onClick={cancel}>やめる</button>
          </div>
        </div>
      ) : (
        <button className="text-button" type="button" ref={openerRef} onClick={() => setState("confirming")}>この記録を消す</button>
      )}
    </div>
  );
};
