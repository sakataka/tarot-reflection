import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { requestBackend } from "./backendClient";
import { AmbientLight } from "./components/AmbientLight";
import { CardBackGrid } from "./components/CardBackGrid";
import { CardCatalog } from "./components/CardCatalog";
import { ClarifyBox } from "./components/ClarifyBox";
import { GuidePanel } from "./components/GuidePanel";
import { Prelude } from "./components/Prelude";
import { ProgressCandle } from "./components/ProgressCandle";
import { QuestionForm } from "./components/QuestionForm";
import { ReadingArchive } from "./components/ReadingArchive";
import { ReadingStage } from "./components/ReadingStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { defaultSpread, spreads } from "./data/spreads";
import type { DrawnCard, Exchange, Reading, SelectedCard } from "./types/tarot";
import { readStoredEngine, storeEngine, type EngineId } from "./utils/engine";
import { findSameNightReading, type ReadingRecord } from "./utils/history";
import { moonPhase, roomHour } from "./utils/moment";
import { readStoredAmbience, startAmbience, stopAmbience, storeAmbience } from "./utils/ambience";
import { readStoredPace, storePace, type NarrationPace } from "./utils/pace";
import { isSoundEnabled, playFlip, playPick, playPlace, setSoundEnabled } from "./utils/sound";
import { createReading, cutDeck, settleShuffle, shuffleDeckForReading } from "./utils/tarot";
import { readStoredWhisper, storeWhisper } from "./utils/whisper";

type View = "reading" | "catalog" | "archive" | "guide" | "settings";
type AsideView = Exclude<View, "reading">;

// 占いの卓の外にある部屋。押しても名前は変えず、開いている部屋だけを灯す。
// 帳面・札箱・作法は部屋の中の物。設定だけは卓の外（舞台裏）なので、少し離して置く。
const navItems: { id: AsideView; label: string }[] = [
  { id: "archive", label: "帳面" },
  { id: "catalog", label: "札箱" },
  { id: "guide", label: "作法" },
  { id: "settings", label: "設定" },
];
// 進み具合は段の番号ではなく、卓の蝋燭の減り方で示す。
const ritualStages = ["打ち明ける", "カードを引く", "言葉を聴く"];

// 画面の段が変わるときは、前の景色が墨のように溶けて次が浮かぶ。対応していない環境や動きを控える設定では、そのまま切り替える。
const withSceneChange = (update: () => void) => {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
};

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
  const [recordsLoading, setRecordsLoading] = useState(true);
  const recordsLoadId = useRef(0);
  const [archiveSelectedId, setArchiveSelectedId] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [shuffleCount, setShuffleCount] = useState(0);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [engine, setEngine] = useState(readStoredEngine);
  const [pace, setPace] = useState(readStoredPace);
  const [ambienceOn, setAmbienceOn] = useState(readStoredAmbience);
  const [whisperOn, setWhisperOn] = useState(readStoredWhisper);
  // 席を立って灯りを消したあとは、部屋の音も止めておく。
  const [roomDark, setRoomDark] = useState(false);
  // 途中の卓を誤って崩さないよう、「最初から」は二度押しで確かめる。
  const [confirmingReset, setConfirmingReset] = useState(false);

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) ?? defaultSpread,
    [selectedSpreadId],
  );

  const loadRecords = useCallback(() => {
    // 入室と更新が重なっても、古い応答で最新の記録や表示状態を戻さない。
    const loadId = ++recordsLoadId.current;
    setRecordsLoading(true);
    setRecordsError("");
    requestBackend<{ readings: ReadingRecord[] }>("readings")
      .then(({ readings }) => {
        if (loadId !== recordsLoadId.current) return;
        setRecords(readings);
        setRecordsError("");
      })
      .catch(() => {
        if (loadId === recordsLoadId.current) setRecordsError("帳面が開けませんでした。（占いのサーバーに届きませんでした。起動しているか確かめてください）");
      })
      .finally(() => {
        if (loadId === recordsLoadId.current) setRecordsLoading(false);
      });
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
    withSceneChange(() => setReading(createReading(question, selectedSpread, selectedCards, { deck: shuffledCards, jumper, clarification })));
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
    withSceneChange(() => {
      setClarification(answered);
      setIsConfiding(false);
      handleShuffle();
    });
  };

  const handleSaved = (record: ReadingRecord) =>
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);

  const openRecord = (record: ReadingRecord) => withSceneChange(() => {
    setArchiveSelectedId(record.id);
    setView("archive");
  });

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
    setArchiveNotice(question ? `「${question.length > 24 ? `${question.slice(0, 24)}…` : question}」の頁を破りました` : "頁を一枚破りました");
    setArchiveSelectedId(null);
  };

  const requestReset = () => {
    if (confirmingReset) withSceneChange(handleReset);
    else setConfirmingReset(true);
  };

  useEffect(() => {
    if (!confirmingReset) return;
    const timer = window.setTimeout(() => setConfirmingReset(false), 3500);
    return () => window.clearTimeout(timer);
  }, [confirmingReset]);

  const toggleView = (next: View) => {
    withSceneChange(() => {
      setArchiveSelectedId(null);
      setView((current) => (current === next ? "reading" : next));
    });
  };
  const openView = (next: View) => withSceneChange(() => setView(next));

  const changeEngine = (next: EngineId) => {
    storeEngine(next);
    setEngine(next);
  };

  const changePace = (next: NarrationPace) => {
    storePace(next);
    setPace(next);
  };

  const changeAmbience = (next: boolean) => {
    storeAmbience(next);
    setAmbienceOn(next);
  };

  const changeWhisper = (next: boolean) => {
    storeWhisper(next);
    setWhisperOn(next);
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
  const hour = roomHour(now);
  const sameNightReading = activeStep === 1 ? findSameNightReading(records, question, now) : undefined;
  const isCatalogOpen = view === "catalog";
  const isAsideOpen = view !== "reading";

  // 景色が変わる前に上へ戻しておき、切り替わりの一枚に収める。
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeStep, view, archiveSelectedId]);

  // 窓の外の明るさ（明け方・昼・夕暮れ・夜）を、部屋全体の色に映す。
  useEffect(() => {
    document.documentElement.dataset.hour = hour;
  }, [hour]);

  // 部屋の音は、ブラウザが音を許す最初の操作のあとで流しはじめる。
  useEffect(() => {
    if (!ambienceOn || roomDark) {
      stopAmbience();
      return;
    }
    const begin = () => startAmbience(hour);
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, begin, { once: true }));
    return () => events.forEach((name) => window.removeEventListener(name, begin));
  }, [ambienceOn, roomDark, hour]);

  const backLabel = "卓へ戻る";

  return (
    <div className="app">
      <Prelude moon={moon} />
      <AmbientLight />
      <header className="site-header">
        <button className="brand" type="button" onClick={() => openView("reading")} aria-label={backLabel}>
          <span className="brand-moon" aria-hidden="true">☾</span>
          <span className="brand-name">Moonlit Tarot</span>
        </button>
        <nav className="site-nav" aria-label="メニュー">
          {navItems.map((item) => (
            <button
              className={`nav-item${view === item.id ? " is-active" : ""}${item.id === "settings" ? " is-backstage" : ""}`}
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
            <p className="ritual-candle" role="status" aria-label={`いまは「${ritualStages[activeStep - 1]}」のところ（三つのうち${["一", "二", "三"][activeStep - 1]}つ目）`}>
              <ProgressCandle step={activeStep} />
              <small aria-hidden="true">{ritualStages[activeStep - 1]}</small>
            </p>
            {activeStep > 1 ? (
              <button className={confirmingReset ? "header-reset is-confirming" : "header-reset"} type="button" onClick={requestReset}>
                {confirmingReset ? "本当に片づけますか" : "卓を片づける"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <main className="app-shell">
        {isAsideOpen && !(view === "archive" && archiveSelectedId) ? (
          <div className={`aside-back is-${view}`}>
            <button className="text-button" type="button" onClick={() => openView("reading")}>← {backLabel}</button>
          </div>
        ) : null}

        {isCatalogOpen ? (
          <CardCatalog />
        ) : view === "guide" ? (
          <GuidePanel onClose={() => openView("reading")} backLabel={backLabel} />
        ) : view === "settings" ? (
          <SettingsPanel
            engine={engine}
            pace={pace}
            soundOn={soundOn}
            ambienceOn={ambienceOn}
            whisperOn={whisperOn}
            onEngineChange={changeEngine}
            onPaceChange={changePace}
            onSoundChange={changeSound}
            onAmbienceChange={(next) => { changeAmbience(next); if (next) startAmbience(hour); }}
            onWhisperChange={changeWhisper}
            onClose={() => openView("reading")}
            backLabel={backLabel}
          />
        ) : view === "archive" ? (
          <ReadingArchive
            records={records}
            selectedId={archiveSelectedId}
            error={recordsError}
            loading={recordsLoading}
            notice={archiveNotice}
            onReload={loadRecords}
            onSelect={(id) => { setArchiveNotice(""); setArchiveSelectedId(id); }}
            onDelete={deleteRecord}
            whisperOn={whisperOn}
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
              hour={hour}
              sameNightReading={sameNightReading}
              onOpenRecord={openRecord}
              onOpenGuide={() => openView("guide")}
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
              whisperOn={whisperOn}
              onSaved={handleSaved}
              onRecordsChange={loadRecords}
              onDarken={() => setRoomDark(true)}
              onRelight={() => {
                if (ambienceOn) startAmbience(hour);
                withSceneChange(() => { setRoomDark(false); handleReset(); });
              }}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
