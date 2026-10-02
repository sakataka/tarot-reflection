import { useCallback, useEffect, useMemo, useState } from "react";
import { requestBackend } from "./backendClient";
import { AmbientLight } from "./components/AmbientLight";
import { CardBackGrid } from "./components/CardBackGrid";
import { CardCatalog } from "./components/CardCatalog";
import { ClarifyBox } from "./components/ClarifyBox";
import { GuidePanel } from "./components/GuidePanel";
import { Prelude } from "./components/Prelude";
import { QuestionForm } from "./components/QuestionForm";
import { ReadingArchive } from "./components/ReadingArchive";
import { ReadingStage } from "./components/ReadingStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { defaultSpread, spreads } from "./data/spreads";
import type { DrawnCard, Exchange, Reading, SelectedCard } from "./types/tarot";
import { readStoredEngine, storeEngine, type EngineId } from "./utils/engine";
import { findSameNightReading, type ReadingRecord } from "./utils/history";
import { moonPhase, timeBand } from "./utils/moment";
import { readStoredPace, storePace, type NarrationPace } from "./utils/pace";
import { isSoundEnabled, playFlip, playPick, playPlace, setSoundEnabled } from "./utils/sound";
import { createReading, cutDeck, settleShuffle, shuffleDeckForReading } from "./utils/tarot";

type View = "reading" | "catalog" | "archive" | "guide" | "settings";
type AsideView = Exclude<View, "reading">;

// 占いの卓の外にある部屋。押しても名前は変えず、開いている部屋だけを灯す。
const navItems: { id: AsideView; label: string }[] = [
  { id: "archive", label: "記録" },
  { id: "catalog", label: "図鑑" },
  { id: "guide", label: "案内" },
  { id: "settings", label: "設定" },
];
const nightBands = new Set(["夕暮れ", "夜", "真夜中", "夜明け前"]);

const App = () => {
  const [question, setQuestion] = useState("");
  const [selectedSpreadId, setSelectedSpreadId] = useState(defaultSpread.id);
  const [shuffledCards, setShuffledCards] = useState<DrawnCard[]>([]);
  const [jumper, setJumper] = useState<DrawnCard | null>(null);
  const [isConfiding, setIsConfiding] = useState(false);
  const [clarification, setClarification] = useState<Exchange | null>(null);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [view, setView] = useState<View>("reading");
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [recordsError, setRecordsError] = useState("");
  const [archiveSelectedId, setArchiveSelectedId] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [shuffleCount, setShuffleCount] = useState(0);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [engine, setEngine] = useState(readStoredEngine);
  const [pace, setPace] = useState(readStoredPace);
  // 途中の卓を誤って崩さないよう、「最初から」は二度押しで確かめる。
  const [confirmingReset, setConfirmingReset] = useState(false);

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) ?? defaultSpread,
    [selectedSpreadId],
  );

  const loadRecords = useCallback(() => {
    requestBackend<{ readings: ReadingRecord[] }>("readings")
      .then(({ readings }) => {
        setRecords(readings);
        setRecordsError("");
      })
      .catch(() => setRecordsError("記録を読み込めませんでした。サーバーが起動しているか確かめてください。"));
  }, []);

  useEffect(loadRecords, [loadRecords]);

  useEffect(() => {
    if (view === "archive") loadRecords();
    else setArchiveNotice("");
  }, [view, loadRecords]);

  useEffect(() => {
    if (!archiveNotice) return;
    const timer = window.setTimeout(() => setArchiveNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [archiveNotice]);

  const handleShuffle = () => {
    setShuffledCards(shuffleDeckForReading());
    setJumper(null);
    setShuffleCount((count) => count + 1);
    setSelectedCards([]);
    setReading(null);
  };

  // 混ぜる手を止めた瞬間の並びで、山が決まる。ときどき一枚がこぼれ落ちる。
  const handleStopShuffle = () => {
    const settled = settleShuffle();
    setShuffledCards(settled.cards);
    setJumper(settled.jumper);
    if (settled.jumper) playFlip();
  };

  const handleCut = (pileIndex: number) => {
    setShuffledCards((cards) => cutDeck(cards, pileIndex));
  };

  const handleToggleCard = (drawnCard: DrawnCard) => {
    const existing = selectedCards.find((selectedCard) => selectedCard.card.id === drawnCard.card.id);

    if (existing) {
      playPlace();
      setSelectedCards(
        selectedCards
          .filter((selectedCard) => selectedCard.card.id !== drawnCard.card.id)
          .map((selectedCard, index) => ({
            ...selectedCard,
            selectedOrder: index + 1,
          })),
      );
      return;
    }

    if (selectedCards.length >= selectedSpread.positions.length) {
      return;
    }

    playPick();
    setSelectedCards([
      ...selectedCards,
      {
        ...drawnCard,
        selectedOrder: selectedCards.length + 1,
      },
    ]);
  };

  const handleReveal = () => {
    playPlace();
    setReading(createReading(question, selectedSpread, selectedCards, { deck: shuffledCards, jumper, clarification }));
  };

  const handleReset = () => {
    setConfirmingReset(false);
    setQuestion("");
    setSelectedSpreadId(defaultSpread.id);
    setShuffledCards([]);
    setJumper(null);
    setIsConfiding(false);
    setClarification(null);
    setSelectedCards([]);
    setReading(null);
  };

  // 問い返しに答えたら（答えなくても）、カードを混ぜ始める。
  const handleProceedFromClarify = (answered: Exchange | null) => {
    setClarification(answered);
    setIsConfiding(false);
    handleShuffle();
  };

  const handleSaved = (record: ReadingRecord) =>
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);

  const openRecord = (record: ReadingRecord) => {
    setArchiveSelectedId(record.id);
    setView("archive");
  };

  // 失敗は呼び出し側（記録の画面）で知らせるので、ここでは投げ返す。
  const deleteRecord = async (id: string) => {
    try {
      await requestBackend(`readings/${id}`, { method: "DELETE" });
    } catch (error) {
      // 別の画面で先に消えていたなら、消したのと同じに扱う。
      if (!(error instanceof Error && error.message === "Reading not found.")) throw error;
    }
    const removed = records.find((record) => record.id === id);
    const question = removed?.question.replace(/\s+/g, " ").trim() ?? "";
    setRecords((current) => current.filter((record) => record.id !== id));
    setArchiveNotice(question ? `「${question.length > 24 ? `${question.slice(0, 24)}…` : question}」の記録を消しました` : "記録を一件消しました");
    setArchiveSelectedId(null);
  };

  const requestReset = () => {
    if (confirmingReset) handleReset();
    else setConfirmingReset(true);
  };

  useEffect(() => {
    if (!confirmingReset) return;
    const timer = window.setTimeout(() => setConfirmingReset(false), 3500);
    return () => window.clearTimeout(timer);
  }, [confirmingReset]);

  const toggleView = (next: View) => {
    setArchiveSelectedId(null);
    setView((current) => (current === next ? "reading" : next));
  };

  const changeEngine = (next: EngineId) => {
    storeEngine(next);
    setEngine(next);
  };

  const changePace = (next: NarrationPace) => {
    storePace(next);
    setPace(next);
  };

  const changeSound = (next: boolean) => {
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playPick();
  };

  const canShuffle = question.trim().length > 0;
  const activeStep = reading ? 3 : shuffledCards.length > 0 ? 2 : 1;
  const now = new Date();
  const moon = moonPhase(now);
  const isNight = nightBands.has(timeBand(now));
  const sameNightReading = activeStep === 1 ? findSameNightReading(records, question, now) : undefined;
  const isCatalogOpen = view === "catalog";
  const isAsideOpen = view !== "reading";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeStep, view, archiveSelectedId]);

  const backLabel = activeStep > 1 ? "卓に戻る" : "占いに戻る";

  return (
    <div className="app">
      <Prelude moon={moon} />
      <AmbientLight />
      <header className="site-header">
        <button className="brand" type="button" onClick={() => { handleReset(); setView("reading"); }} aria-label="最初の画面へ戻る">
          <span className="brand-moon" aria-hidden="true">☾</span>
          <span className="brand-name">Tarot Reflection</span>
        </button>
        <nav className="site-nav" aria-label="メニュー">
          {navItems.map((item) => (
            <button
              className={view === item.id ? "nav-item is-active" : "nav-item"}
              type="button"
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => toggleView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {!isAsideOpen ? (
          <div className="header-progress">
            <ol className="ritual-steps" aria-label="リーディングの進行">
              {["問いを置く", "カードを引く", "言葉を受け取る"].map((label, index) => {
                const step = index + 1;
                return (
                  <li className={step === activeStep ? "ritual-step is-active" : step < activeStep ? "ritual-step is-done" : "ritual-step"} key={label} aria-current={step === activeStep ? "step" : undefined}>
                    <span aria-hidden="true">{["I", "II", "III"][index]}</span>
                    <small>{label}</small>
                  </li>
                );
              })}
            </ol>
            {activeStep > 1 ? (
              <button className={confirmingReset ? "header-reset is-confirming" : "header-reset"} type="button" onClick={requestReset}>
                {confirmingReset ? "本当に最初から？" : "最初から"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <main className="app-shell">
        {isAsideOpen && !(view === "archive" && archiveSelectedId) ? (
          <div className={`aside-back is-${view}`}>
            <button className="text-button" type="button" onClick={() => setView("reading")}>← {backLabel}</button>
          </div>
        ) : null}

        {isCatalogOpen ? (
          <CardCatalog />
        ) : view === "guide" ? (
          <GuidePanel onClose={() => setView("reading")} backLabel={backLabel} />
        ) : view === "settings" ? (
          <SettingsPanel
            engine={engine}
            pace={pace}
            soundOn={soundOn}
            onEngineChange={changeEngine}
            onPaceChange={changePace}
            onSoundChange={changeSound}
            onClose={() => setView("reading")}
            backLabel={backLabel}
          />
        ) : view === "archive" ? (
          <ReadingArchive
            records={records}
            selectedId={archiveSelectedId}
            error={recordsError}
            notice={archiveNotice}
            onSelect={(id) => { setArchiveNotice(""); setArchiveSelectedId(id); }}
            onDelete={deleteRecord}
          />
        ) : null}

        {activeStep === 1 ? (
          <div hidden={isAsideOpen}>
            <QuestionForm
              question={question}
              spreads={spreads}
              selectedSpreadId={selectedSpread.id}
              canShuffle={canShuffle}
              moon={moon}
              isNight={isNight}
              sameNightReading={sameNightReading}
              onOpenRecord={openRecord}
              onOpenGuide={() => setView("guide")}
              onQuestionChange={setQuestion}
              onSpreadChange={setSelectedSpreadId}
              onConfide={() => setIsConfiding(true)}
              clarifySlot={isConfiding ? (
                <ClarifyBox active={!isAsideOpen} question={question.trim()} onProceed={handleProceedFromClarify} onEdit={() => setIsConfiding(false)} />
              ) : undefined}
            />
          </div>
        ) : null}

        {shuffledCards.length > 0 && !reading ? (
          <div hidden={isAsideOpen}>
            <CardBackGrid
              key={shuffleCount}
              active={!isAsideOpen}
              question={question.trim()}
              cards={shuffledCards}
              jumper={jumper}
              selectedCards={selectedCards}
              requiredCount={selectedSpread.positions.length}
              positions={selectedSpread.positions}
              onStopShuffle={handleStopShuffle}
              onCut={handleCut}
              onToggleCard={handleToggleCard}
              onReveal={handleReveal}
              onReshuffle={handleShuffle}
            />
          </div>
        ) : null}

        {reading ? (
          <div hidden={isAsideOpen}>
            <ReadingStage
              reading={reading}
              active={!isAsideOpen}
              pace={pace}
              onSaved={handleSaved}
              onRecordsChange={loadRecords}
              onNewQuestion={handleReset}
              onOpenRecords={() => toggleView("archive")}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
