import { useEffect, useRef, useState } from "react";
import { tarotDeck } from "../data/tarotDeck";
import { readingFromRecord, type ReadingRecord } from "../utils/history";
import { lunationOf, moonPhase } from "../utils/moment";
import { parseNarration } from "../utils/narration";
import { oracleName } from "../utils/persona";
import { tableCards } from "../utils/tarot";
import { ExchangeList } from "./FollowUpBox";
import { MoonGlyph } from "./MoonGlyph";
import { NarrationView } from "./NarrationView";
import { ReadingHeading, TableStrip } from "./ReadingTable";
import { CelticCross } from "./CelticCross";

type ReadingArchiveProps = {
  records: ReadingRecord[];
  selectedId: string | null;
  error: string;
  loading: boolean;
  // 記録を消したあと、一覧の先頭にしばらく出す知らせ。
  notice: string;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => Promise<void>;
  onReload: () => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

// 一巡りの月を三十の小さな月で描き、相談のあった夜に灯をともす。今いる巡りには今夜の印を置く。
const lunarDays = 30;

const LunarStrip = ({ start, records, now }: { start: Date; records: ReadingRecord[]; now: Date }) => {
  const dayOf = (date: Date) => Math.min(lunarDays - 1, Math.floor((date.getTime() - start.getTime()) / 86_400_000));
  const counts = new Map<number, number>();
  records.forEach((record) => {
    const day = dayOf(new Date(record.createdAt));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  const today = lunationOf(now).start.getTime() === start.getTime() ? dayOf(now) : -1;
  return (
    <ol className="lunar-strip" aria-hidden="true">
      {Array.from({ length: lunarDays }, (_, day) => (
        <li key={day} className={`${counts.has(day) ? "is-visited" : ""}${day === today ? " is-today" : ""}`.trim() || undefined}>
          <MoonGlyph age={day + 0.5} className="lunar-moon" />
          {counts.has(day) ? <i className="lunar-mark">{counts.get(day)! > 1 ? counts.get(day) : ""}</i> : null}
        </li>
      ))}
    </ol>
  );
};

const groupByLunation = (records: ReadingRecord[]) => {
  const groups: { index: number; start: Date; records: ReadingRecord[] }[] = [];
  records.forEach((record) => {
    const lunation = lunationOf(new Date(record.createdAt));
    const group = groups.find((item) => item.index === lunation.index);
    if (group) group.records.push(record);
    else groups.push({ ...lunation, records: [record] });
  });
  return groups.sort((a, b) => b.index - a.index);
};

export const ReadingArchive = ({ records, selectedId, error, loading, notice, onSelect, onDelete, onReload }: ReadingArchiveProps) => {
  const selected = records.find((record) => record.id === selectedId);
  // 一覧が浮かび上がる動きは最初の一度だけ。記録から戻ったときは、そのまま見せる。
  const listShown = useRef(false);
  const settled = listShown.current;
  useEffect(() => {
    if (!selected) listShown.current = true;
  });
  const now = new Date();
  return selected ? (
    <ArchivedReading record={selected} onBack={() => onSelect(null)} onDelete={onDelete} />
  ) : (
    <section className={settled ? "archive-panel is-settled" : "archive-panel"}>
      <div className="catalog-heading">
        <div>
          <p className="ornament-kicker">Ledger of Nights</p>
          <h1>帳面</h1>
          <p>引いたカードと、{oracleName}の言葉を綴じてあります。月の満ち欠けの巡りごとに、新しい夜から。</p>
        </div>
      </div>

      {notice ? <p className="archive-notice" role="status">{notice}</p> : null}
      {loading ? <p className="catalog-empty" role="status">帳面をめくっています…</p> : null}
      {error ? (
        <div className="archive-load-error" role="alert">
          <p className="copy-fallback">{error}</p>
          <button className="secondary-button" type="button" onClick={onReload} disabled={loading}>もう一度、帳面を開く</button>
        </div>
      ) : null}
      {records.length === 0 && !loading && !error ? <p className="catalog-empty">帳面はまだ白いままです。語りを最後まで受け取った夜が、ここに綴じられます。</p> : null}

      <div className="archive-lunations" aria-busy={loading}>
        {groupByLunation(records).map((group) => (
          <section className="lunation" key={group.index} aria-label={`${formatStart(group.start)}の新月からの巡り`}>
            <div className="lunation-heading">
              <h2>{formatStart(group.start)}の新月から</h2>
              <small>{group.records.length}夜</small>
            </div>
            <LunarStrip start={group.start} records={group.records} now={now} />
            <ol className="archive-list">
              {group.records.map((record) => {
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
        ))}
      </div>
      {records.length > 0 ? <p className="archive-privacy">この帳面は、このMacの外へは持ち出しません。</p> : null}
    </section>
  );
};

// 月の巡りは平均の月齢で数えるので、日付までは言わず「何月の新月」と呼ぶ。
const formatStart = (date: Date) => `${date.getMonth() + 1}月`;

const ArchivedReading = ({ record, onBack, onDelete }: {
  record: ReadingRecord;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
}) => {
  const reading = readingFromRecord(record);
  if (!reading) {
    return (
      <section className="archive-panel">
        <p className="copy-fallback">この頁は、インクがかすれて読めませんでした。</p>
        <button className="secondary-button" type="button" onClick={onBack}>帳面の最初へ</button>
      </section>
    );
  }

  const cardCount = tableCards(reading).length;
  const segments = parseNarration(record.narration, true, cardCount);

  return (
    <div className="archive-reading reading-stage">
      <div className="archive-toolbar">
        <button className="text-button" type="button" onClick={onBack}>← 帳面の最初へ</button>
      </div>
      <ReadingHeading reading={reading} />
      <TableStrip reading={reading} revealed={Array.from({ length: cardCount }, () => true)} />
      <CelticCross reading={reading} revealed={Array.from({ length: cardCount }, () => true)} />
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
        <NarrationView
          reading={reading}
          segments={segments.map((segment) => ({ segment, text: segment.text }))}
        />
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
          aria-label="頁を破るかの確認"
          onKeyDown={(event) => {
            if (event.key === "Escape" && state !== "deleting") cancel();
          }}
        >
          <p className="archive-delete-title">この夜の頁を、帳面から破りますか</p>
          <p className="archive-delete-question">{record.question}</p>
          <p className="archive-delete-note">カードと{oracleName}の言葉、聞き返しも消えます。破った頁は、元には戻せません。</p>
          {state === "failed" ? (
            <p className="copy-fallback" role="alert">頁が破れませんでした。（占いのサーバーに届きませんでした。起動しているか確かめてください）</p>
          ) : null}
          <div className="archive-delete-actions">
            <button className="danger-button" type="button" disabled={state === "deleting"} onClick={confirm}>
              {state === "deleting" ? "破っています…" : state === "failed" ? "もう一度破る" : "頁を破る"}
            </button>
            <button className="text-button" type="button" ref={cancelRef} disabled={state === "deleting"} onClick={cancel}>やめる</button>
          </div>
        </div>
      ) : (
        <button className="text-button" type="button" ref={openerRef} onClick={() => setState("confirming")}>この頁を帳面から破る</button>
      )}
    </div>
  );
};
